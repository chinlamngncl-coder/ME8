# Snapshot live ME8 into ME8 Firmware Gold baseline (code + site config).
# Run once after MOB sign-off. Re-run only when user authorizes a new lock.
param([string]$AppRoot = '')
$ErrorActionPreference = 'Stop'
$OutRoot = $PSScriptRoot
if (-not $AppRoot) {
    $AppRoot = Resolve-Path (Join-Path $OutRoot '..\..')
    if (-not (Test-Path (Join-Path $AppRoot 'server.js'))) {
        $AppRoot = 'C:\Users\user\Desktop\Enterprise Mobility\ME8'
    }
}

function Get-FileSha256([string]$Path) {
    return (Get-FileHash -Path $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

$paths = @(
    'server.js',
    'package.json',
    'package-lock.json',
    '.env',
    '.env.example',
    '.env.me8.example',
    '.env.enterprise.example',
    'RESTART-FLEET.bat',
    'README-ME8.md',
    'BASELINE-ME8-FIRMWARE-GOLD.md',
    'BASELINE-ME8-V1.md',
    'CREATE-ME8-FIRMWARE-GOLD.ps1',
    'VERIFY-ME8-FIRMWARE-GOLD.ps1',
    'RESTORE-ME8-FIRMWARE-GOLD.ps1',
    'NEW-ME8-INSTALL.ps1',
    'VERIFY-ME8-FRESH.ps1',
    'BUILD-ME8-CUSTOMER.ps1',
    'LOCK-SECRETS-ACL.ps1',
    'SMOKE-COMPOSE.ps1',
    'kill-fleet-ports.ps1'
)

Get-ChildItem (Join-Path $AppRoot 'scripts') -Filter '*.ps1' -File -ErrorAction SilentlyContinue | ForEach-Object {
    $paths += 'scripts/' + $_.Name
}
Get-ChildItem (Join-Path $AppRoot 'scripts') -Filter '*.js' -File -ErrorAction SilentlyContinue | ForEach-Object {
    $paths += 'scripts/' + $_.Name
}
if (Test-Path (Join-Path $AppRoot 'scripts\country-tile-bboxes.json')) {
    $paths += 'scripts/country-tile-bboxes.json'
}
Get-ChildItem (Join-Path $AppRoot 'scripts\me8-ship') -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
    $rel = $_.FullName.Substring($AppRoot.Length + 1) -replace '\\', '/'
    $paths += $rel
}
Get-ChildItem (Join-Path $AppRoot 'scripts\trial-ship') -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
    $rel = $_.FullName.Substring($AppRoot.Length + 1) -replace '\\', '/'
    $paths += $rel
}

Get-ChildItem (Join-Path $AppRoot 'docker') -File -ErrorAction SilentlyContinue | ForEach-Object {
    $paths += 'docker/' + $_.Name
}

Get-ChildItem (Join-Path $AppRoot 'lib') -Filter '*.js' -File | ForEach-Object {
    $paths += 'lib/' + $_.Name
}

$htmlFiles = @(
    'public/index.html',
    'public/login.html',
    'public/live.html',
    'public/matrix.html',
    'public/command-centre.html',
    'public/command-wall.html'
)
foreach ($h in $htmlFiles) {
    if (Test-Path (Join-Path $AppRoot ($h -replace '/', '\'))) { $paths += $h }
}
if (Test-Path (Join-Path $AppRoot 'public/css/centre-summary.css')) {
    $paths += 'public/css/centre-summary.css'
}
Get-ChildItem (Join-Path $AppRoot 'public/assets') -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
    $rel = $_.FullName.Substring($AppRoot.Length + 1) -replace '\\', '/'
    $paths += $rel
}
Get-ChildItem (Join-Path $AppRoot 'public/locales') -Filter '*.json' -File -ErrorAction SilentlyContinue | ForEach-Object {
    $paths += 'public/locales/' + $_.Name
}
Get-ChildItem (Join-Path $AppRoot 'public/js') -Filter '*.js' -File | ForEach-Object {
    $paths += 'public/js/' + $_.Name
}
Get-ChildItem (Join-Path $AppRoot 'public/vendor') -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
    $rel = $_.FullName.Substring($AppRoot.Length + 1) -replace '\\', '/'
    $paths += $rel
}

Get-ChildItem (Join-Path $AppRoot 'data/gis/offline') -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
    $rel = $_.FullName.Substring($AppRoot.Length + 1) -replace '\\', '/'
    $paths += $rel
}

Get-ChildItem (Join-Path $AppRoot 'docs') -Filter 'ME8-*.md' -File -ErrorAction SilentlyContinue | ForEach-Object {
    $paths += 'docs/' + $_.Name
}
foreach ($doc in @('docs/LAB-8BWC-README.md', 'docs/LICENSE-OPERATIONS.md', 'docs/ME8-POST-RESTORE-CHECKLIST.md')) {
    if (Test-Path (Join-Path $AppRoot ($doc -replace '/', '\'))) { $paths += $doc }
}
Get-ChildItem (Join-Path $AppRoot 'docs/google-feedback-discussion') -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
    $rel = $_.FullName.Substring($AppRoot.Length + 1) -replace '\\', '/'
    $paths += $rel
}
Get-ChildItem (Join-Path $AppRoot 'pack/me8-fresh') -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
    $rel = $_.FullName.Substring($AppRoot.Length + 1) -replace '\\', '/'
    $paths += $rel
}
Get-ChildItem (Join-Path $AppRoot 'pack/me8-ship') -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
    $rel = $_.FullName.Substring($AppRoot.Length + 1) -replace '\\', '/'
    $paths += $rel
}

Get-ChildItem (Join-Path $AppRoot '.cursor/rules') -Filter '*.mdc' -File -ErrorAction SilentlyContinue | ForEach-Object {
    $paths += '.cursor/rules/' + $_.Name
}

$configStorage = @(
    'storage/dashboard-users.json',
    'storage/dispatch-groups.json',
    'storage/server-settings.json',
    'storage/dock-registry.json',
    'storage/tenant-profile.json',
    'storage/bwc-devices.json',
    'storage/video-channels.json',
    'storage/conference-state.json',
    'storage/conference-settings.json',
    'storage/mobility.db',
    'storage/platform-license.json'
)
foreach ($rel in $configStorage) {
    if (Test-Path (Join-Path $AppRoot ($rel -replace '/', '\'))) {
        $paths += $rel
    }
}

$paths = $paths | Select-Object -Unique | Sort-Object

$gitHead = ''
try {
    $gitHead = (& git -C $AppRoot rev-parse --short HEAD 2>$null)
} catch { $gitHead = '' }

Write-Host 'CREATE ME8 Firmware Gold baseline'
Write-Host "  FROM $AppRoot"
Write-Host "  INTO $OutRoot"
Write-Host ''

$saved = 0
$missing = @()
$hashes = @()
$fileEntries = @()

foreach ($rel in $paths) {
    $src = Join-Path $AppRoot ($rel -replace '/', '\')
    if (-not (Test-Path $src)) {
        Write-Host "  MISSING LIVE: $rel" -ForegroundColor Red
        $missing += $rel
        continue
    }
    $dst = Join-Path $OutRoot ($rel -replace '/', '\')
    $dir = Split-Path $dst -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    Copy-Item $src $dst -Force
    $sha = Get-FileSha256 $dst
    $tier = if ($rel -like 'storage/*') { 'me8-config' } elseif ($rel -eq '.env') { 'me8-env' } elseif ($rel -like 'data/gis/*') { 'me8-gis' } elseif ($rel -like 'docs/*') { 'me8-docs' } elseif ($rel -like 'docker/*') { 'me8-docker' } elseif ($rel -like 'pack/*') { 'me8-pack' } elseif ($rel -like '.cursor/*') { 'me8-cursor' } else { 'me8-firmware-gold' }
    $hashes += [ordered]@{ path = $rel; sha256 = $sha }
    $fileEntries += [ordered]@{ path = $rel; tier = $tier }
    Write-Host "  locked $rel"
    $saved++
}

if ($missing.Count -gt 0) {
    Write-Host ''
    Write-Host "FAILED: $($missing.Count) required file(s) missing from live app." -ForegroundColor Red
    exit 1
}

$manifest = [ordered]@{
    label = 'ME8 Firmware Gold'
    version = 'me8-firmware-gold-20260706'
    locked = '2026-07-06'
    gitCommit = $gitHead
    videoWallCache = '20260705-pin-mirror-complete'
    note = 'Pin canvas mirror + Open All pass. storage/secrets/ not snapshotted. AI must not RESTORE unless user types RUN RESTORE-ME8-FIRMWARE-GOLD.'
    predecessor = 'me8-pin-video-i18n-20260704'
    frozen = @(
        'public/index.html',
        'public/js/video-wall.js',
        'public/js/fleet-ui.js',
        'public/js/ptt-rx.js',
        'lib/psG711Audio.js',
        'lib/pttServer.js',
        'lib/sipServer.js',
        'public/vendor/jsmpeg.min.js'
    )
    files = $fileEntries
}
$manifest | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $OutRoot 'MANIFEST.json') -Encoding UTF8
@{ files = $hashes } | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $OutRoot 'HASHES.json') -Encoding UTF8

Write-Host ''
Write-Host "ME8 Firmware Gold lock: $saved files in $OutRoot"
Write-Host 'Next: .\VERIFY-ME8-FIRMWARE-GOLD.ps1'
