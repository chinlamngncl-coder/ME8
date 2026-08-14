#Requires -Version 5.1
<#
.SYNOPSIS
  PACK-CN-AXIOM-ENTERPRISE — build dist/Mobility_Axiom_Deploy + zip

.DESCRIPTION
  China partner commercial pack (Steps 4–6). Does NOT zip the live lab folder as-is.
  Requires master_license.json at ME8 root (Ed25519 license.lic JSON or platform-license JSON).

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\PACK-CN-AXIOM-ENTERPRISE.ps1
#>
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not (Test-Path (Join-Path $Root 'package.json'))) {
    $Root = Split-Path -Parent $MyInvocation.MyCommand.Path
    if (-not (Test-Path (Join-Path $Root 'package.json'))) {
        throw "Cannot find ME8 root from $($MyInvocation.MyCommand.Path)"
    }
}
Set-Location $Root

Write-Host ''
Write-Host 'PACK GATHER (CN enterprise) — licensing + protected ship + purge secrets + zip' -ForegroundColor Cyan
Write-Host ''

$Master = Join-Path $Root 'master_license.json'
if (-not (Test-Path $Master)) {
    Write-Host 'FATAL STEP 5: master_license.json is MISSING from ME8 root.' -ForegroundColor Red
    Write-Host 'Place the signed partner license at:' -ForegroundColor Yellow
    Write-Host "  $Master"
    Write-Host 'Expected: air-gap license.lic JSON (hardwareId + features + signature)' -ForegroundColor Yellow
    Write-Host '       or platform-license.json shape (maxBwcDevices / signature).' -ForegroundColor Yellow
    Write-Host 'Then re-run this script.' -ForegroundColor Yellow
    exit 2
}

$Stage = Join-Path $Root 'dist\Mobility_Axiom_Deploy'
$Zip = Join-Path $Root 'dist\Mobility_Axiom_Deploy.zip'
Write-Host "[stage] Cleaning $Stage"
if (Test-Path $Stage) { Remove-Item -Recurse -Force $Stage }
New-Item -ItemType Directory -Force -Path $Stage | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Stage 'storage') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Stage 'keys') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Stage 'vendor\ffmpeg-lgpl') | Out-Null

# Prefer protected ship blob if present
$Protected = Join-Path $Root 'ship-build\protected'
if (-not (Test-Path (Join-Path $Protected 'run.js'))) {
    Write-Host '[build] ship-build/protected missing — running npm run build:ship ...' -ForegroundColor Yellow
    npm run build:ship
    if ($LASTEXITCODE -ne 0) { throw 'build:ship failed' }
}
if (-not (Test-Path (Join-Path $Protected 'run.js'))) {
    throw 'ship-build/protected/run.js still missing after build:ship'
}

Write-Host '[copy] protected runtime + public + docker + launchers'
Copy-Item -Recurse -Force $Protected (Join-Path $Stage 'ship-build\protected')
# Flatten convenience: also expose run.js at stage root via Start bat path
New-Item -ItemType Directory -Force -Path (Join-Path $Stage 'ship-build\protected') | Out-Null

foreach ($rel in @(
    'public',
    'docker',
    'Axiom_Enterprise_Setup.bat',
    'axiom_setup.sh',
    '.env.deploy.example',
    'package.json',
    'package-lock.json'
)) {
    $src = Join-Path $Root $rel
    if (Test-Path $src) {
        $dest = Join-Path $Stage $rel
        if (Test-Path $src -PathType Container) {
            Copy-Item -Recurse -Force $src $dest
        } else {
            $parent = Split-Path $dest -Parent
            if ($parent -and -not (Test-Path $parent)) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
            Copy-Item -Force $src $dest
        }
    }
}

# FFmpeg LGPL binary
$Ffmpeg = Join-Path $Root 'vendor\ffmpeg-lgpl\ffmpeg.exe'
if (Test-Path $Ffmpeg) {
    Copy-Item -Force $Ffmpeg (Join-Path $Stage 'vendor\ffmpeg-lgpl\ffmpeg.exe')
    Copy-Item -Force (Join-Path $Root 'vendor\ffmpeg-lgpl\README-VENDOR-LGPL.md') (Join-Path $Stage 'vendor\ffmpeg-lgpl\') -ErrorAction SilentlyContinue
} else {
    Write-Host 'WARN: vendor/ffmpeg-lgpl/ffmpeg.exe missing — pack will start but media decode may fail.' -ForegroundColor Yellow
}

# Optional offline GIS tiles
$Gis = Join-Path $Root 'data\gis\offline'
if (Test-Path $Gis) {
    New-Item -ItemType Directory -Force -Path (Join-Path $Stage 'data\gis') | Out-Null
    Copy-Item -Recurse -Force $Gis (Join-Path $Stage 'data\gis\offline')
} else {
    Write-Host 'WARN: data/gis/offline missing — CN offline map meta is on; partner needs offline tiles or maps stay blank.' -ForegroundColor Yellow
}

# STEP 5 — inject master license (Copy-Item = no UTF-8 BOM; Set-Content BOM breaks JSON.parse)
$raw = Get-Content $Master -Raw -Encoding UTF8
$licObj = $null
try { $licObj = $raw | ConvertFrom-Json } catch { throw "master_license.json is not valid JSON: $_" }

$stageLicLic = Join-Path $Stage 'storage\license.lic'
$stagePlat = Join-Path $Stage 'storage\platform-license.json'
$pay = $licObj.payload
$isAirgap = [bool]($licObj.signature -and (
    $licObj.hardwareId -or $licObj.features -or
    ($pay -and ($pay.hardwareId -or $pay.features -or $pay.maxBwcDevices -ne $null))
))
$isPlatform = [bool](
    ($licObj.maxBwcDevices -ne $null -and -not $pay) -or $licObj.type -or
    ($pay -and $pay.type)
)
if ($isAirgap) {
    Copy-Item -Force $Master $stageLicLic
    Write-Host '[license] Wrote storage/license.lic (air-gap shape, no BOM)'
}
if ($isPlatform) {
    Copy-Item -Force $Master $stagePlat
    Write-Host '[license] Wrote storage/platform-license.json (platform/caps shape, no BOM)'
}
# Always keep a copy under storage/master_license.json for audit
Copy-Item -Force $Master (Join-Path $Stage 'storage\master_license.json')

# If neither classic field set matched, still drop as license.lic (Setup gate)
if (-not (Test-Path $stageLicLic) -and -not (Test-Path $stagePlat)) {
    Copy-Item -Force $Master $stageLicLic
    Write-Host '[license] Wrote storage/license.lic (raw master copy, no BOM)'
}

# STEP 4 — purge private keys / lab secrets from staging
Write-Host '[purge] Removing private keys and lab secrets from staging'
$purge = @(
    'keys\license-private.pem',
    'license-private.pem',
    '.env',
    'storage\secrets',
    'tools\generate-license.js'
)
foreach ($p in $purge) {
    $full = Join-Path $Stage $p
    if (Test-Path $full) {
        Remove-Item -Recurse -Force $full
        Write-Host "  purged $p"
    }
}
Get-ChildItem -Path $Stage -Recurse -Filter '*private*.pem' -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item -Force $_.FullName
    Write-Host "  purged $($_.FullName.Substring($Stage.Length))"
}
Get-ChildItem -Path $Stage -Recurse -Filter '.env' -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.Name -eq '.env') { Remove-Item -Force $_.FullName; Write-Host "  purged nested .env" }
}

# Ship .env template only
Copy-Item -Force (Join-Path $Root '.env.deploy.example') (Join-Path $Stage '.env.deploy.example')
# Enforce air-gap flag in template
$envEx = Get-Content (Join-Path $Stage '.env.deploy.example') -Raw
if ($envEx -notmatch 'FM_AIRGAP_LICENSE_REQUIRED=1') {
    $envEx = $envEx.TrimEnd() + "`r`nFM_AIRGAP_LICENSE_REQUIRED=1`r`n"
    Set-Content (Join-Path $Stage '.env.deploy.example') $envEx -Encoding UTF8
}

# README for partner
@"
# Mobility Axiom — Enterprise Deploy (China partner)

## Start (Windows)
1. Install Docker Desktop (required for Valkey / Postgres / WVP / ZLM).
2. Install Node.js 22+ if not bundled.
3. Double-click **Axiom_Enterprise_Setup.bat**
4. Enter this server LAN/WAN IP when prompted.
5. Open http://YOUR_IP:3888

## Start (Linux)
chmod +x axiom_setup.sh && ./axiom_setup.sh

## License
Signed license is under ``storage/``. Do not edit. Air-gap required.

## Maps
UI defaults to Jiangsu / zh / offline tiles. If map is blank, install offline GIS under ``data/gis/offline``.

## Never
- Do not use 172.17–172.31 as server IP (Docker/WSL).
- Do not place license-private.pem on this machine.
"@ | Set-Content -Path (Join-Path $Stage 'README-DEPLOY.txt') -Encoding UTF8

# Inject CN face into staged HTML only (never bake into lab source)
function Inject-CnPartnerFace([string]$htmlPath) {
    if (-not (Test-Path $htmlPath)) { return }
    $h = Get-Content $htmlPath -Raw -Encoding UTF8
    if ($h -match 'fm-default-lang') {
        $h = $h -replace '<meta name="fm-locales"[^>]*>', '<meta name="fm-locales" content="zh,en">'
        $h = $h -replace '<meta name="fm-default-lang"[^>]*>', '<meta name="fm-default-lang" content="zh">'
    } else {
        $h = $h -replace '(<head>)', "`$1`r`n    <meta name=`"fm-locales`" content=`"zh,en`">`r`n    <meta name=`"fm-default-lang`" content=`"zh`">"
    }
    if ($h -match 'fm-map-countries') {
        $h = $h -replace '<meta name="fm-map-countries"[^>]*>', '<meta name="fm-map-countries" content="cn">'
    } else {
        $h = $h -replace '(<meta name="fm-default-lang"[^>]*>)', "`$1`r`n    <meta name=`"fm-map-countries`" content=`"cn`">"
    }
    if ($h -notmatch 'fm-map-offline-only') {
        $h = $h -replace '(<meta name="fm-map-countries"[^>]*>)', "`$1`r`n    <meta name=`"fm-map-offline-only`" content=`"1`">"
        if ($h -notmatch 'fm-map-offline-only') {
            $h = $h -replace '(<head>)', "`$1`r`n    <meta name=`"fm-map-offline-only`" content=`"1`">"
        }
    }
    # Jiangsu fallback if Singapore lab coords still in staged copy
    $h = $h -replace 'pos:\s*\[1\.3521,\s*103\.8198\]', 'pos: [32.0617, 118.7630]'
    [System.IO.File]::WriteAllText($htmlPath, $h)
}
Inject-CnPartnerFace (Join-Path $Stage 'public\index.html')
Inject-CnPartnerFace (Join-Path $Stage 'public\login.html')
Inject-CnPartnerFace (Join-Path $Stage 'ship-build\protected\public\index.html')
Inject-CnPartnerFace (Join-Path $Stage 'ship-build\protected\public\login.html')

# Ensure Set-DeployHostEnv.ps1 is available next to launcher
New-Item -ItemType Directory -Force -Path (Join-Path $Stage 'scripts') | Out-Null
Copy-Item -Force (Join-Path $Root 'scripts\Set-DeployHostEnv.ps1') (Join-Path $Stage 'scripts\Set-DeployHostEnv.ps1')
Copy-Item -Force (Join-Path $Root 'scripts\PACK-CN-AXIOM-ENTERPRISE.ps1') (Join-Path $Stage 'scripts\') -ErrorAction SilentlyContinue

Write-Host "[zip] $Zip"
if (Test-Path $Zip) { Remove-Item -Force $Zip }
Compress-Archive -Path $Stage -DestinationPath $Zip -Force

Write-Host ''
Write-Host "OK — staging: $Stage" -ForegroundColor Green
Write-Host "OK — zip:     $Zip" -ForegroundColor Green
Write-Host ''
Write-Host 'Partner runs: Axiom_Enterprise_Setup.bat (inside the unzipped folder).'
