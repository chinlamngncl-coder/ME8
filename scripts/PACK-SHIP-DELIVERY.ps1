# Mobility Axiom — delivery pack core (no source, no lab storage, no internal docs).
param(
    [Parameter(Mandatory = $true)][string]$AppRoot,
    [Parameter(Mandatory = $true)][string]$OutRoot,
    [Parameter(Mandatory = $true)][ValidateSet('Apac', 'Cn')][string]$Variant,
    [string]$ApacOutName = 'Trial June Mobility Axiom',
    [string]$CnOutName = 'CN Trial Mobility',
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

$ForbiddenNames = @(
    'server.js', 'BASELINE-TRIAL-GOLD.md', 'CS.md', 'CLAUDE.md', 'RESTORE-TRIAL-GOLD.ps1', 'VERIFY-TRIAL-GOLD.ps1'
)
$ForbiddenDirs = @(
    'lib', '.cursor', '.git', 'baseline', 'docs', 'mobile-android',
    'Important-Mobility-Axiom-Shipping', 'MobilityC2-VENDOR-IMPORTANT', 'ship-build-test'
)
$ForbiddenStorage = @(
    'sos-incidents', 'backups', 'snapshots',
    'conference-shares', 'evidence-attachments', 'evidence-exports', 'secure-exports',
    'face-plate', 'firmware-ota', 'videos', 'llm'
)
$ForbiddenScriptPatterns = @(
    'PACK-', 'build-', 'generate-', 'i18n-', 'issue-license', 'fetch-china', 'BUILD-CHINA', 'RESTORE', 'VERIFY-TRIAL'
)

if ($Variant -eq 'Cn') { $OutRoot = if ($OutRoot) { $OutRoot } else { Join-Path $env:USERPROFILE 'Desktop\CN Trial Mobility' } }
else { $OutRoot = if ($OutRoot) { $OutRoot } else { Join-Path $env:USERPROFILE "Desktop\$ApacOutName" } }

Write-Step "Delivery pack ($Variant) -> $OutRoot"

$llmSrc = Join-Path $AppRoot 'storage\llm\qwen2.5-3b-instruct-q4_k_m.gguf'
if (-not (Test-Path $llmSrc)) { $llmSrc = Join-Path $AppRoot 'vendor\llm\qwen2.5-3b-instruct-q4_k_m.gguf' }
if (-not (Test-Path $llmSrc)) { throw 'LLM model missing in storage\llm or vendor\llm' }

$apkSrc = Join-Path $AppRoot 'mobile-android\MobilityConference\app\build\outputs\apk\debug\MobilityConference-1.5.6.apk'
if (-not (Test-Path $apkSrc)) { $apkSrc = Join-Path $AppRoot 'mobile-android\MobilityConference\MobilityConference.apk' }
if (-not (Test-Path $apkSrc)) { throw 'MobilityConference APK not found' }

$licenseSrc = Join-Path $AppRoot 'storage\platform-license-trial.json'
if (-not (Test-Path $licenseSrc)) { throw 'storage\platform-license-trial.json missing (issue trial license on dev machine only)' }

if (Test-Path $OutRoot) {
    try {
        Remove-Item $OutRoot -Recurse -Force
    } catch {
        Write-Host 'WARN: full OutRoot remove blocked (server running?) - refreshing in place...' -ForegroundColor Yellow
        $staleApp = Join-Path $OutRoot 'Mobility-Axiom'
        if (Test-Path $staleApp) {
            Get-ChildItem $staleApp -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        }
        Get-ChildItem $OutRoot -Force -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -ne 'Mobility-Axiom' } |
            Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    }
}
New-Item -ItemType Directory -Force -Path $OutRoot | Out-Null
$appDir = Join-Path $OutRoot 'Mobility-Axiom'
New-Item -ItemType Directory -Force -Path $appDir | Out-Null

Write-Step 'Stage public UI...'
Copy-Tree (Join-Path $AppRoot 'public') (Join-Path $appDir 'public')

if ($Variant -eq 'Cn') {
    $locDir = Join-Path $appDir 'public\locales'
    foreach ($code in @('fil', 'id', 'th', 'ko')) {
        $f = Join-Path $locDir "$code.json"
        if (Test-Path $f) { Remove-Item $f -Force }
    }
    $cnMeta = @(
        '<meta name="fm-locales" content="en,zh">'
        '<meta name="fm-map-countries" content="cn">'
        '<meta name="fm-map-offline" content="1">'
        '<meta name="fm-map-offline-only" content="1">'
    ) -join "`n    "
    foreach ($html in @('index.html', 'login.html')) {
        $p = Join-Path $appDir "public\$html"
        $raw = Get-Content $p -Raw -Encoding UTF8
        if ($raw -notmatch 'fm-locales') {
            $raw = $raw -replace '(<meta charset="UTF-8">)', "`$1`n    $cnMeta"
            Set-Content $p $raw -Encoding UTF8 -NoNewline
        }
    }
    $gisSrc = Join-Path $AppRoot 'data\gis\offline'
    if (Test-Path $gisSrc) {
        Copy-Tree $gisSrc (Join-Path $appDir 'data\gis\offline')
    }
}

Write-Step 'Stage docker + vendor helpers...'
Copy-Tree (Join-Path $AppRoot 'docker') (Join-Path $appDir 'docker')
New-Item -ItemType Directory -Force -Path (Join-Path $appDir 'scripts') | Out-Null
Copy-Item (Join-Path $AppRoot 'scripts\START-LIVEKIT.ps1') (Join-Path $appDir 'scripts\START-LIVEKIT.ps1') -Force
Copy-Item (Join-Path $AppRoot 'scripts\trial-ship\verify-install-ship.js') (Join-Path $appDir 'scripts\verify-install.js') -Force
Copy-Item (Join-Path $AppRoot 'scripts\trial-ship\package.ship.json') (Join-Path $appDir 'package.json') -Force
if (Test-Path (Join-Path $AppRoot 'package-lock.json')) {
    Copy-Item (Join-Path $AppRoot 'package-lock.json') (Join-Path $appDir 'package-lock.json') -Force
}
foreach ($f in @('kill-fleet-ports.ps1', 'VIEW-LOG.bat')) {
    $s = Join-Path $AppRoot $f
    if (Test-Path $s) { Copy-Item $s (Join-Path $appDir $f) -Force }
}
Copy-Item (Join-Path $AppRoot 'scripts\trial-ship\RESTART-FLEET.bat') (Join-Path $appDir 'RESTART-FLEET.bat') -Force

Write-Step 'Bundle server runtime (run.js) — no lib/ shipped...'
Set-Location $AppRoot
node (Join-Path $AppRoot 'scripts\build-ship-runtime.js') $AppRoot (Join-Path $appDir 'run.js')
if ($LASTEXITCODE -ne 0) { throw 'build-ship-runtime failed' }

Write-Step 'Bundle LLM...'
$vendorLlm = Join-Path $appDir 'vendor\llm'
New-Item -ItemType Directory -Force -Path $vendorLlm | Out-Null
Copy-Item $llmSrc (Join-Path $vendorLlm 'qwen2.5-3b-instruct-q4_k_m.gguf') -Force

Write-Step 'Clean trial storage only...'
$storage = Join-Path $appDir 'storage'
if (Test-Path $storage) {
    try {
        Remove-Item $storage -Recurse -Force
    } catch {
        Write-Host 'WARN: storage folder locked (trial server running?) - overwriting trial files in place...' -ForegroundColor Yellow
        Get-ChildItem $storage -Force -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -notin @('mobility.db', 'mobility.db-wal', 'mobility.db-shm') } |
            Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    }
}
New-Item -ItemType Directory -Force -Path $storage | Out-Null
Copy-Item $licenseSrc (Join-Path $storage 'platform-license.json') -Force
$bwcEmptyJson = '{"devices":[]}'
Set-Content (Join-Path $storage 'bwc-devices.json') $bwcEmptyJson -Encoding UTF8
New-Item -ItemType Directory -Force -Path (Join-Path $storage 'conference-recordings') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $storage 'ftp-uploads') | Out-Null

Write-Step 'Customer .env template (partner-safe)...'
Copy-Item (Join-Path $AppRoot 'scripts\trial-ship\.env.example.ship') (Join-Path $appDir '.env.example') -Force

Write-Step 'Partner scrub (internal strings)...'
node (Join-Path $AppRoot 'scripts\scrub-partner-pack.js') $appDir
if ($LASTEXITCODE -ne 0) { throw 'scrub-partner-pack failed on Mobility-Axiom' }

Write-Step 'Bundle portable Node 20 + node_modules (no client npm install)...'
node (Join-Path $AppRoot 'scripts\bundle-ship-node.js') $AppRoot $appDir
if ($LASTEXITCODE -ne 0) { throw 'bundle-ship-node failed' }

Write-Step 'VERIFY delivery pack (must pass)...'
foreach ($name in $ForbiddenNames) {
    if ($name -eq 'server.js') {
        if (Test-Path (Join-Path $appDir 'server.js')) { throw 'FORBIDDEN in pack: server.js' }
        continue
    }
    $hits = Get-ChildItem $appDir -Recurse -File -Filter $name -ErrorAction SilentlyContinue
    if ($hits) { throw "FORBIDDEN in pack: $name" }
}
foreach ($dir in $ForbiddenDirs) {
    $p = Join-Path $appDir $dir
    if (Test-Path $p) { throw "FORBIDDEN dir in pack: $dir" }
}
foreach ($sub in $ForbiddenStorage) {
    $p = Join-Path $storage $sub
    if (Test-Path $p) { throw "FORBIDDEN storage in pack: storage/$sub" }
}
$scriptsDir = Join-Path $appDir 'scripts'
if (Test-Path $scriptsDir) {
    Get-ChildItem $scriptsDir -File | ForEach-Object {
        foreach ($pat in $ForbiddenScriptPatterns) {
            if ($_.Name -like "*$pat*") { throw "FORBIDDEN script in pack: scripts/$($_.Name)" }
        }
    }
    $allowed = @('verify-install.js', 'START-LIVEKIT.ps1')
    Get-ChildItem $scriptsDir -File | ForEach-Object {
        if ($allowed -notcontains $_.Name) { throw "Unexpected script in pack: scripts/$($_.Name)" }
    }
}
if (-not (Test-Path (Join-Path $appDir 'run.js'))) { throw 'run.js missing' }
if (-not (Test-Path (Join-Path $appDir 'tools\node\node.exe'))) { throw 'tools/node/node.exe missing' }
if (-not (Test-Path (Join-Path $appDir 'node_modules\dotenv'))) { throw 'node_modules/dotenv missing' }
if (Test-Path (Join-Path $appDir 'server.js')) { throw 'server.js must not ship' }
if (Test-Path (Join-Path $appDir 'lib')) { throw 'lib/ must not ship' }

$totalFiles = (Get-ChildItem $OutRoot -Recurse -File | Measure-Object).Count
if ($Variant -eq 'Cn' -and $totalFiles -gt 25000) {
    Write-Host "WARN: CN pack file count high: $totalFiles (check for stray data)" -ForegroundColor Yellow
}
if ($Variant -eq 'Apac' -and $totalFiles -gt 15000) {
    Write-Host "WARN: APAC pack file count high: $totalFiles" -ForegroundColor Yellow
}

Write-Step 'Root deliverables...'
Copy-Item (Join-Path $AppRoot 'scripts\trial-ship\Install-Mobility.bat') (Join-Path $OutRoot 'Install-Mobility.bat') -Force
Copy-Item (Join-Path $AppRoot 'scripts\trial-ship\Start Mobility.bat') (Join-Path $OutRoot 'Start Mobility.bat') -Force
Copy-Item $apkSrc (Join-Path $OutRoot 'MobilityConference-1.5.6.apk') -Force
Copy-Item (Join-Path $AppRoot 'scripts\trial-ship\THIRD-PARTY-NOTICES.ship.md') (Join-Path $OutRoot 'THIRD-PARTY-NOTICES.md') -Force

if ($Variant -eq 'Cn') {
    node (Join-Path $AppRoot 'scripts\generate-cn-trial-manuals.js') --out (Join-Path $OutRoot 'manuals')
    if ($LASTEXITCODE -ne 0) { throw 'CN manuals failed' }
    Set-Content (Join-Path $OutRoot 'CHINA-MAP-README.txt') @"
China offline map (Beijing metro, zoom 3-12). Path: Mobility-Axiom\data\gis\offline\tiles\
No internet required for basemap. (c) OpenStreetMap contributors.
"@ -Encoding UTF8
    Set-Content (Join-Path $OutRoot 'README.txt') @"
CN Trial Mobility - Delivery Pack
Languages: English + Chinese (Simplified). Map: offline Beijing tiles.

WHAT YOU NEED ON THE PC
  - Windows 10/11 (64-bit)
  - Docker Desktop (Video Conference only): https://www.docker.com/products/docker-desktop/
  - Node.js is INCLUDED in this pack — do NOT install Node separately.

INSTALL (once)
  1. Unzip the full folder to e.g. C:\Mobility-Trial\
  2. Install Docker Desktop, start it (whale icon steady)
  3. Double-click Install-Mobility.bat
  4. Double-click Start Mobility.bat

LOGIN
  http://localhost:3888   username: global   password: global123

Manuals: manuals\en\ and manuals\zh\ — read Quick-Guide.md first.
"@ -Encoding UTF8
} else {
    node (Join-Path $AppRoot 'scripts\generate-trial-manuals.js') --out (Join-Path $OutRoot 'manuals')
    if ($LASTEXITCODE -ne 0) { throw 'APAC manuals failed' }
    Set-Content (Join-Path $OutRoot 'README.txt') @"
Mobility Axiom Trial - Delivery Pack
Languages: English, Korean, Thai, Indonesian, Filipino.

WHAT YOU NEED ON THE PC
  - Windows 10/11 (64-bit)
  - Docker Desktop (Video Conference only): https://www.docker.com/products/docker-desktop/
  - Node.js is INCLUDED in this pack — do NOT install Node separately.

INSTALL (once)
  1. Unzip the full folder to e.g. C:\Mobility-Trial\
  2. Install Docker Desktop, start it (whale icon steady)
  3. Double-click Install-Mobility.bat
  4. Double-click Start Mobility.bat

LOGIN
  http://localhost:3888   username: global   password: global123

Manuals: manuals\ folder — open Quick-Guide.md in your language.
"@ -Encoding UTF8
}

Write-Step 'Partner scrub (root deliverables)...'
node (Join-Path $AppRoot 'scripts\scrub-partner-pack.js') $OutRoot
if ($LASTEXITCODE -ne 0) { throw 'scrub-partner-pack failed on OutRoot' }

if (-not $SkipZip) {
    $stamp = Get-Date -Format 'yyyyMMdd-HHmm'
    $zipName = if ($Variant -eq 'Cn') { "CN-Trial-Mobility-$stamp.zip" } else { "Mobility-Axiom-Trial-$stamp.zip" }
    $zipPath = Join-Path $OutRoot $zipName
    Write-Step "Zip: $zipName (large)..."
    Compress-Archive -Path (Join-Path $OutRoot '*') -DestinationPath $zipPath -CompressionLevel Optimal
}

Write-Host ''
Write-Host 'DELIVERY PACK OK' -ForegroundColor Green
Write-Host "  Variant:  $Variant"
Write-Host "  Folder:   $OutRoot"
Write-Host "  Files:    $totalFiles"
Write-Host '  Shipped:  run.js + bundled Node 20 + node_modules (no lib/, no server.js)'
Write-Host '  Storage:  clean trial only'
if (-not $SkipZip) { Write-Host "  Zip:      $zipPath" }
Write-Host ''
