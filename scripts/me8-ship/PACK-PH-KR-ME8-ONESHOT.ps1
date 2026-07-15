# Ubitron ME8 — PH/KR one-shot delivery pack (Mobility Test 2).
# Ship desk only. Output: Desktop\Mobility Test 2 + zip. No secrets in customer pack.
param(
    [string]$AppRoot = '',
    [string]$OutRoot = '',
    [string]$ApkSrc = '',
    [switch]$SkipZip
)
$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host $msg -ForegroundColor Cyan }
function Copy-Tree($src, $dst) {
    if (-not (Test-Path $src)) { return }
    New-Item -ItemType Directory -Force -Path $dst | Out-Null
    robocopy $src $dst /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy failed $src -> $dst ($LASTEXITCODE)" }
}

function Get-Me8AppRoot {
    if ($AppRoot -and (Test-Path (Join-Path $AppRoot 'server.js'))) {
        return (Resolve-Path $AppRoot).Path
    }
    $grand = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
    if (Test-Path (Join-Path $grand 'server.js')) { return $grand }
    throw 'ME8 AppRoot not found'
}

$denylistScript = Join-Path $PSScriptRoot 'SHIP-CONFIDENTIAL-DENYLIST.ps1'
if (-not (Test-Path $denylistScript)) { throw 'SHIP-CONFIDENTIAL-DENYLIST.ps1 missing' }
. $denylistScript

$AppRoot = Get-Me8AppRoot
if (-not $OutRoot) {
    $OutRoot = Join-Path $env:USERPROFILE 'Desktop\Mobility Test 2'
}
$OutRoot = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutRoot)

$AppName = 'Ubitron-ME8'
$HttpPort = 3988
$LicenseExpires = '2036-07-12'
$LicenseCustomer = 'Mobility Test 2'
$ShipDir = Join-Path $PSScriptRoot 'ph-kr-ship'
$IssuerRoot = Join-Path (Split-Path $AppRoot -Parent) 'MobilityC2-VENDOR-IMPORTANT\LicenseIssuer'
$IssueScript = Join-Path $IssuerRoot 'issue-license.js'
$PublicKeySrc = Join-Path $IssuerRoot 'keys\license-public.pem'

$ForbiddenNames = @(
    'server.js', 'BASELINE-TRIAL-GOLD.md', 'BASELINE-ME8-POC-DEMO.md', 'CS.md', 'CLAUDE.md',
    'RESTORE-TRIAL-GOLD.ps1', 'VERIFY-TRIAL-GOLD.ps1', 'test-zlm.html', 'test-wvp-tile.html', 'license-private.pem'
)
$ForbiddenDirs = @(
    'lib', '.cursor', '.git', 'baseline', 'docs', 'mobile-android', 'pack',
    'Important-Mobility-Axiom-Shipping', 'MobilityC2-VENDOR-IMPORTANT', 'ship-build-test',
    'storage-lab-backup'
)
$ForbiddenStorage = @(
    'sos-incidents', 'backups', 'snapshots', 'conference-shares', 'evidence-attachments',
    'evidence-exports', 'secure-exports', 'face-plate', 'firmware-ota', 'videos', 'llm'
)
$ForbiddenScriptPatterns = @(
    'PACK-', 'build-', 'generate-', 'i18n-', 'issue-license', 'fetch-china', 'BUILD-CHINA',
    'RESTORE', 'VERIFY-TRIAL', 'BUILD-ME8', 'NEW-ME8'
)
$StripLocales = @('th', 'id', 'zh')

Write-Step "PH/KR ME8 one-shot pack -> $OutRoot"
Write-Host "  AppRoot: $AppRoot" -ForegroundColor Gray

# --- Prerequisites ---
$llmFile = 'qwen2.5-1.5b-instruct-q4_k_m.gguf'
$llmSrc = Join-Path $AppRoot "vendor\llm\$llmFile"
if (-not (Test-Path $llmSrc)) { $llmSrc = Join-Path $AppRoot "storage\llm\$llmFile" }
if (-not (Test-Path $llmSrc)) { throw "LLM model missing: vendor\llm\$llmFile" }

if (-not $ApkSrc) {
    $candidates = @(
        (Join-Path (Split-Path $AppRoot -Parent) 'SaaS Mobility\mobile-android\MobilityConference\app\build\outputs\apk\debug\MobilityConference-1.5.6.apk'),
        (Join-Path $AppRoot 'mobile-android\MobilityConference\app\build\outputs\apk\debug\MobilityConference-1.5.6.apk')
    )
    foreach ($c in $candidates) { if (Test-Path $c) { $ApkSrc = $c; break } }
}
if (-not $ApkSrc -or -not (Test-Path $ApkSrc)) { throw 'MobilityConference-1.5.6.apk not found' }

$ffmpegSrc = Join-Path $AppRoot 'vendor\ffmpeg-lgpl\ffmpeg.exe'
if (-not (Test-Path $ffmpegSrc)) { throw 'vendor\ffmpeg-lgpl\ffmpeg.exe missing' }

if (-not (Test-Path $IssueScript)) { throw "License issuer missing: $IssueScript" }
if (-not (Test-Path $PublicKeySrc)) { throw "license-public.pem missing: $PublicKeySrc" }

# --- Issue customer license (5 BWC, 10yr, FR + VC) ---
$licenseTmp = Join-Path $env:TEMP ("me8-ship-license-" + [guid]::NewGuid().ToString() + '.json')
Write-Step 'Issue platform license (5 BWC, 10 years, FR + VC)...'
Set-Location $IssuerRoot
node $IssueScript `
    --customer $LicenseCustomer `
    --type perpetual `
    --bwc 5 `
    --users 10 `
    --expires $LicenseExpires `
    --face 5 `
    --vc `
    --out $licenseTmp
if ($LASTEXITCODE -ne 0) { throw 'issue-license failed' }
if (-not (Test-Path $licenseTmp)) { throw 'license file not created' }

# --- Stage output root ---
if (Test-Path $OutRoot) {
    try {
        Remove-Item $OutRoot -Recurse -Force
    } catch {
        Write-Host 'WARN: full OutRoot remove blocked — refreshing in place...' -ForegroundColor Yellow
        Get-ChildItem $OutRoot -Force -ErrorAction SilentlyContinue |
            Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    }
}
New-Item -ItemType Directory -Force -Path $OutRoot | Out-Null

# Re-run manuals into fresh OutRoot
node (Join-Path $AppRoot 'scripts\me8-ship\generate-ph-kr-me8-manuals.js') --out (Join-Path $OutRoot 'manuals')
if ($LASTEXITCODE -ne 0) { throw 'manual generation failed (second pass)' }

$appDir = Join-Path $OutRoot $AppName
New-Item -ItemType Directory -Force -Path $appDir | Out-Null

Write-Step 'Stage public UI (en, fil, ko locales only)...'
Copy-Tree (Join-Path $AppRoot 'public') (Join-Path $appDir 'public')
# Never leave internal root docs in customer app dir (refresh-in-place can leave strays)
foreach ($bad in $ForbiddenNames) {
    Get-ChildItem $appDir -Recurse -File -Filter $bad -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
}
$locDir = Join-Path $appDir 'public\locales'
foreach ($code in $StripLocales) {
    $f = Join-Path $locDir "$code.json"
    if (Test-Path $f) { Remove-Item $f -Force }
}
foreach ($html in @('index.html', 'login.html', 'command-wall.html')) {
    $p = Join-Path $appDir "public\$html"
    if (-not (Test-Path $p)) { continue }
    $raw = Get-Content $p -Raw -Encoding UTF8
    if ($raw -match 'fm-locales') {
        $raw = $raw -replace 'content="en[^"]*"', 'content="en,fil,ko"'
    } else {
        $raw = $raw -replace '(<meta charset="UTF-8">)', "`$1`n    <meta name=`"fm-locales`" content=`"en,fil,ko`">"
    }
    $zlm = Join-Path $appDir "public\$html"
    if ($html -eq 'test-zlm.html' -or $html -eq 'test-wvp-tile.html') { continue }
    Set-Content $p $raw -Encoding UTF8 -NoNewline
}
$labZlm = Join-Path $appDir 'public\test-zlm.html'
if (Test-Path $labZlm) { Remove-Item $labZlm -Force }
$labWvp = Join-Path $appDir 'public\test-wvp-tile.html'
if (Test-Path $labWvp) { Remove-Item $labWvp -Force }
$labWvpJs = Join-Path $appDir 'public\js\wvp-lab-tile.js'
if (Test-Path $labWvpJs) { Remove-Item $labWvpJs -Force }

Write-Step 'Stage docker, vendor, FR sidecar...'
Copy-Tree (Join-Path $AppRoot 'docker') (Join-Path $appDir 'docker')
# Lab-only docker trees — not for customer handoff
foreach ($labDocker in @('wvp', 'zlm-config')) {
    $p = Join-Path $appDir "docker\$labDocker"
    if (Test-Path $p) { Remove-Item $p -Recurse -Force }
}
foreach ($labFile in @('zlm.compose.yml', 'zlm-config.example.ini', 'docker-compose.enterprise.yml')) {
    $p = Join-Path $appDir "docker\$labFile"
    if (Test-Path $p) { Remove-Item $p -Force }
}
New-Item -ItemType Directory -Force -Path (Join-Path $appDir 'vendor\ffmpeg-lgpl') | Out-Null
Copy-Item $ffmpegSrc (Join-Path $appDir 'vendor\ffmpeg-lgpl\ffmpeg.exe') -Force

# mvp-zlm-in-pack — optional Windows MediaServer in customer pack (no Docker)
$zlmSrcExe = Join-Path $AppRoot 'vendor\zlmediakit\MediaServer.exe'
if (Test-Path $zlmSrcExe) {
    $zlmDst = Join-Path $appDir 'vendor\zlmediakit'
    New-Item -ItemType Directory -Force -Path $zlmDst | Out-Null
    Copy-Item $zlmSrcExe (Join-Path $zlmDst 'MediaServer.exe') -Force
    Get-ChildItem (Join-Path $AppRoot 'vendor\zlmediakit') -Filter '*.dll' -File -ErrorAction SilentlyContinue | ForEach-Object {
        Copy-Item $_.FullName (Join-Path $zlmDst $_.Name) -Force
    }
    $zlmCfg = Join-Path $AppRoot 'vendor\zlmediakit\config.ini'
    $zlmCfgEx = Join-Path $AppRoot 'vendor\zlmediakit\config.ini.example'
    if (Test-Path $zlmCfg) { Copy-Item $zlmCfg (Join-Path $zlmDst 'config.ini') -Force }
    elseif (Test-Path $zlmCfgEx) { Copy-Item $zlmCfgEx (Join-Path $zlmDst 'config.ini') -Force }
    Copy-Item (Join-Path $AppRoot 'vendor\zlmediakit\README.md') (Join-Path $zlmDst 'README.md') -Force -ErrorAction SilentlyContinue
    Write-Host "  included vendor\zlmediakit\MediaServer.exe"
} else {
    Write-Host "  skip ZLM pack binary (vendor\zlmediakit\MediaServer.exe missing — run INSTALL-ZLM-PACK.ps1)"
}

$frDst = Join-Path $appDir 'fr-sidecar'
New-Item -ItemType Directory -Force -Path $frDst | Out-Null
foreach ($f in @('app.py', 'requirements.txt', 'INSTALL.ps1')) {
    Copy-Item (Join-Path $AppRoot "fr-sidecar\$f") (Join-Path $frDst $f) -Force
}

New-Item -ItemType Directory -Force -Path (Join-Path $appDir 'scripts') | Out-Null
Copy-Item (Join-Path $AppRoot 'scripts\START-LIVEKIT.ps1') (Join-Path $appDir 'scripts\START-LIVEKIT.ps1') -Force
Copy-Item (Join-Path $AppRoot 'scripts\trial-ship\verify-install-ship.js') (Join-Path $appDir 'scripts\verify-install.js') -Force
Copy-Item (Join-Path $ShipDir 'package.ship.json') (Join-Path $appDir 'package.json') -Force
foreach ($f in @('kill-fleet-ports.ps1', 'VIEW-LOG.bat', 'START-FR.bat', 'START-FACE-MATCHING.bat')) {
    $s = Join-Path $AppRoot $f
    if (Test-Path $s) { Copy-Item $s (Join-Path $appDir $f) -Force }
}
Copy-Item (Join-Path $ShipDir 'RESTART-FLEET.bat') (Join-Path $appDir 'RESTART-FLEET.bat') -Force

New-Item -ItemType Directory -Force -Path (Join-Path $appDir 'keys') | Out-Null
Copy-Item $PublicKeySrc (Join-Path $appDir 'keys\license-public.pem') -Force

Write-Step 'Bundle server runtime (run.js) — no lib/ shipped...'
Set-Location $AppRoot
node (Join-Path $AppRoot 'scripts\build-ship-runtime.js') $AppRoot (Join-Path $appDir 'run.js')
if ($LASTEXITCODE -ne 0) { throw 'build-ship-runtime failed' }

Write-Step 'Bundle LLM...'
$vendorLlm = Join-Path $appDir 'vendor\llm'
New-Item -ItemType Directory -Force -Path $vendorLlm | Out-Null
Copy-Item $llmSrc (Join-Path $vendorLlm $llmFile) -Force

Write-Step 'Factory storage + license...'
$storage = Join-Path $appDir 'storage'
if (Test-Path $storage) { Remove-Item $storage -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Force -Path $storage | Out-Null

$packFresh = Join-Path $AppRoot 'pack\me8-fresh'
$template = Join-Path $packFresh 'storage-template'
$manifest = Get-Content (Join-Path $packFresh 'MANIFEST.json') -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($rel in $manifest.requiredFiles) {
    Copy-Item (Join-Path $template $rel) (Join-Path $storage $rel) -Force
}
foreach ($rel in $manifest.emptyDirs) {
    if ($ForbiddenStorage -contains $rel) { continue }
    New-Item -ItemType Directory -Force -Path (Join-Path $storage $rel) | Out-Null
}
New-Item -ItemType Directory -Force -Path (Join-Path $storage 'conference-recordings') | Out-Null
Copy-Item $licenseTmp (Join-Path $storage 'platform-license.json') -Force
Remove-Item $licenseTmp -Force -ErrorAction SilentlyContinue

Write-Step 'Customer .env template...'
Copy-Item (Join-Path $ShipDir '.env.example.ship') (Join-Path $appDir '.env.example') -Force

Write-Step 'Partner scrub...'
node (Join-Path $AppRoot 'scripts\scrub-partner-pack.js') $appDir
if ($LASTEXITCODE -ne 0) { throw 'scrub-partner-pack failed on app dir' }

Write-Step 'Purge confidential artifacts...'
$purged = Remove-ShipConfidentialArtifacts -PackRoot $appDir -DenylistSourceRoot $AppRoot
if ($purged.Count -gt 0) {
    Write-Host "  Removed $($purged.Count) internal artifact(s) from app dir" -ForegroundColor Gray
}

Write-Step 'Confidential denylist scan (pre-bundle)...'
$denyScan = Test-ShipConfidentialDenylist -PackRoot $appDir -DenylistSourceRoot $AppRoot -OnFail {
    param($msg)
    Write-Host "[fail] $msg" -ForegroundColor Red
} -OnOk { }
if (-not $denyScan.ok) { throw 'Confidential denylist failed on app dir (pre-bundle)' }

Write-Step 'Bundle portable Node 22 + node_modules...'
node (Join-Path $AppRoot 'scripts\bundle-ship-node.js') $AppRoot $appDir
if ($LASTEXITCODE -ne 0) { throw 'bundle-ship-node failed' }

Write-Step 'VERIFY delivery pack...'
foreach ($mod in @('multer', 'nodemailer', 'qrcode', 'express', 'dotenv')) {
    $p = Join-Path $appDir "node_modules\$mod"
    if (-not (Test-Path $p)) { throw "MISSING node_modules/$mod after bundle - ship package.json out of sync" }
}
foreach ($name in $ForbiddenNames) {
    if ($name -eq 'server.js') {
        if (Test-Path (Join-Path $appDir 'server.js')) { throw 'FORBIDDEN: server.js' }
        continue
    }
    $hits = Get-ChildItem $appDir -Recurse -File -Filter $name -ErrorAction SilentlyContinue
    if ($hits) { throw "FORBIDDEN in pack: $name" }
}
foreach ($dir in $ForbiddenDirs) {
    $p = Join-Path $appDir $dir
    if (Test-Path $p) { throw "FORBIDDEN dir: $dir" }
}
foreach ($sub in $ForbiddenStorage) {
    $p = Join-Path $storage $sub
    if (Test-Path $p) { throw "FORBIDDEN storage: storage/$sub" }
}
$scriptsDir = Join-Path $appDir 'scripts'
if (Test-Path $scriptsDir) {
    Get-ChildItem $scriptsDir -File | ForEach-Object {
        foreach ($pat in $ForbiddenScriptPatterns) {
            if ($_.Name -like "*$pat*") { throw "FORBIDDEN script: scripts/$($_.Name)" }
        }
    }
    $allowed = @('verify-install.js', 'START-LIVEKIT.ps1')
    Get-ChildItem $scriptsDir -File | ForEach-Object {
        if ($allowed -notcontains $_.Name) { throw "Unexpected script: scripts/$($_.Name)" }
    }
}
if (-not (Test-Path (Join-Path $appDir 'run.js'))) { throw 'run.js missing' }
if (-not (Test-Path (Join-Path $appDir 'tools\node\node.exe'))) { throw 'tools/node/node.exe missing' }
if (-not (Test-Path (Join-Path $appDir 'node_modules\dotenv'))) { throw 'node_modules/dotenv missing' }
if (Test-Path (Join-Path $appDir 'lib')) { throw 'lib/ must not ship' }
if (Test-Path (Join-Path $appDir 'keys\license-private.pem')) { throw 'license-private.pem must not ship' }

$totalFiles = (Get-ChildItem $OutRoot -Recurse -File | Measure-Object).Count

Write-Step 'Root deliverables...'
Copy-Item (Join-Path $ShipDir 'Install-Ubitron.bat') (Join-Path $OutRoot 'Install-Ubitron.bat') -Force
Copy-Item (Join-Path $ShipDir 'Start Ubitron.bat') (Join-Path $OutRoot 'Start Ubitron.bat') -Force
Copy-Item $ApkSrc (Join-Path $OutRoot 'MobilityConference-1.5.6.apk') -Force
Copy-Item (Join-Path $AppRoot 'scripts\trial-ship\THIRD-PARTY-NOTICES.ship.md') (Join-Path $OutRoot 'THIRD-PARTY-NOTICES.md') -Force
Copy-Item (Join-Path $ShipDir 'START-FACE-MATCHING.bat') (Join-Path $OutRoot 'START-FACE-MATCHING.bat') -Force

$readme = @"
Ubitron Mobility C2 - Mobility Test 2
Languages: English, Filipino, Korean.

WHAT YOU NEED ON THE PC
  - Windows 10/11 (64-bit)
  - Docker Desktop (Video Conference): https://www.docker.com/products/docker-desktop/
  - Python 3.11+ (Face Analytics) - see Installation-Guide
  - Node.js is INCLUDED - do NOT install Node separately.

INSTALL (once, in order) - brand-new PC
  1. Unzip this folder to e.g. C:\Mobility-Test-2\
  2. Install Docker Desktop; start it (whale icon steady)
  3. Double-click Install-Ubitron.bat
  4. Double-click Start Ubitron.bat

ALREADY HAD AN OLD TRIAL (port 3888 / previous folder)
  Read manuals\<your-language>\Migration-Guide.md first.
  Do NOT uninstall Docker. Stop old server, rename old folder, install this pack in a NEW folder.

FIRST LOGIN
  http://localhost:$HttpPort   username: global   password: global123
  Change password immediately after login.
  Then set server IPv4 in Settings; VC app URL must use port $HttpPort (not 3888).

LICENSE (pre-installed, no key entry)
  5 body-worn cameras, 10 dashboard users, Face Analytics, Video Conference
  Valid until $LicenseExpires

MANUALS
  Installation-Guide.md  - new PC
  Migration-Guide.md     - upgrading from old trial
  Quick-Guide.md / User-Manual.md / Configuration-Manual.md
  Folders: manuals\en\  manuals\fil\  manuals\ko\
"@
Set-Content (Join-Path $OutRoot 'README.txt') $readme -Encoding UTF8

node (Join-Path $AppRoot 'scripts\scrub-partner-pack.js') $OutRoot
if ($LASTEXITCODE -ne 0) { throw 'scrub-partner-pack failed on OutRoot' }

$privKey = Get-ChildItem $OutRoot -Recurse -File -Filter 'license-private.pem' -ErrorAction SilentlyContinue
if ($privKey) { throw 'license-private.pem must not ship in customer pack' }

if (-not $SkipZip) {
    $stamp = Get-Date -Format 'yyyyMMdd-HHmm'
    $zipName = "Mobility-Test-2-$stamp.zip"
    $zipPath = Join-Path (Split-Path $OutRoot -Parent) $zipName
    Write-Step "Zip: $zipName (large - please wait)..."
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    Compress-Archive -Path (Join-Path $OutRoot '*') -DestinationPath $zipPath -CompressionLevel Optimal
}

Write-Host ''
Write-Host 'PH/KR ME8 DELIVERY PACK OK' -ForegroundColor Green
Write-Host "  Folder:   $OutRoot"
Write-Host "  Files:    $totalFiles"
Write-Host "  License:  5 BWC, 10 users, FR 5, VC, expires $LicenseExpires"
Write-Host "  Port:     $HttpPort"
Write-Host '  Secrets:  none shipped (FTP/SIP configured in Settings after login)'
if (-not $SkipZip) { Write-Host "  Zip:      $zipPath" }
Write-Host ''
