# Snapshot live ME8 into classic-PASS backup (Soft Open / lab WVP off — operator PASS 2026-07-18).
# Floor before clean WVP/ZLM return. Does NOT replace Firmware Gold.
# AI restores only when user types: RUN RESTORE-ME8-CLASSIC-PASS-20260718
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
    '.gitignore',
    'RESTART-FLEET.bat',
    'README-ME8.md',
    'BASELINE-ME8-CLASSIC-PASS-20260718.md',
    'BASELINE-ME8-PRE-GATE-C.md',
    'BASELINE-ME8-FIRMWARE-GOLD.md',
    'BASELINE-ME8-V1.md',
    'NEW-ME8-INSTALL.ps1',
    'VERIFY-ME8-FRESH.ps1',
    'BUILD-ME8-CUSTOMER.ps1',
    'LOCK-SECRETS-ACL.ps1',
    'SMOKE-COMPOSE.ps1',
    'kill-fleet-ports.ps1',
    'CREATE-ME8-CLASSIC-PASS-20260718.ps1',
    'RESTORE-ME8-CLASSIC-PASS-20260718.ps1',
    'VERIFY-ME8-CLASSIC-PASS-20260718.ps1'
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
Get-ChildItem (Join-Path $AppRoot 'scripts\lab') -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
    $rel = $_.FullName.Substring($AppRoot.Length + 1) -replace '\\', '/'
    $paths += $rel
}

Get-ChildItem (Join-Path $AppRoot 'docker') -File -ErrorAction SilentlyContinue | ForEach-Object {
    $paths += 'docker/' + $_.Name
}
Get-ChildItem (Join-Path $AppRoot 'docker\wvp') -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
    $rel = $_.FullName.Substring($AppRoot.Length + 1) -replace '\\', '/'
    if ($rel -notmatch 'node_modules|\.git/') { $paths += $rel }
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
    'public/command-wall.html',
    'public/test-zlm.html',
    'public/test-seeta.html'
)
foreach ($h in $htmlFiles) {
    if (Test-Path (Join-Path $AppRoot ($h -replace '/', '\'))) { $paths += $h }
}
Get-ChildItem (Join-Path $AppRoot 'public/css') -Filter '*.css' -File -ErrorAction SilentlyContinue | ForEach-Object {
    $paths += 'public/css/' + $_.Name
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

# Classic-PASS paper + keep discs
Get-ChildItem (Join-Path $AppRoot 'docs') -Filter 'ME8-*.md' -File -ErrorAction SilentlyContinue | ForEach-Object {
    $paths += 'docs/' + $_.Name
}
foreach ($pat in @(
    'MOB-DISC-CLASSIC*',
    'MOB-DISC-BACKUP-CLASSIC*',
    'MOB-DISC-CALL-*',
    'MOB-DISC-HOLD-TO-TALK*',
    'MOB-DISC-LIVE-PANEL-NOT-MUTE*',
    'MOB-DISC-WHO-CHANGED-BWC*',
    'MOB-DISC-PIN-*',
    'MOB-DISC-KILL-SWITCH*',
    'MOB-DISC-BWC-REKEY*',
    'MOB-DISC-CHIN-5062*',
    'MOB-DISC-PTT-HALF*',
    'MOB-DISC-PLAIN-PLAN-KEEP*',
    'MOB-DISC-OPERATOR-NEXT-APPLY*',
    'MOB-APPLIED-CALL-MIC*',
    'MOB-APPLIED-BWC-STOP*',
    'MOB-APPLIED-PIN-*',
    'MOB-APPLIED-CLASSIC*',
    'MOB-APPLIED-GIT-RESTORE-SOFTOPEN*',
    'MOB-APPLIED-SOFTOPEN-OFF*',
    'MOB-APPLIED-BWC-REKEY*',
    'MOB-APPLIED-LAB-GIT-PUSH-CLASSIC*',
    'MOB-APPLIED-LAB-GIT-PUSH-SAFETY*',
    'MOB-APPLIED-LAB-GIT-PUSH-OPS*',
    'MOB-APPLIED-SAFETY-COMMIT*'
)) {
    Get-ChildItem (Join-Path $AppRoot 'docs') -Filter $pat -File -ErrorAction SilentlyContinue | ForEach-Object {
        $paths += 'docs/' + $_.Name
    }
}
foreach ($doc in @(
    'docs/LAB-8BWC-README.md',
    'docs/LICENSE-OPERATIONS.md',
    'docs/ME8-POST-RESTORE-CHECKLIST.md',
    'docs/MOB-DISC-GATE-A-SOAK-PASS.md',
    'docs/MOB-DISC-BWC-PTT-DURING-LIVE-CALL.md',
    'docs/MOB-DISC-SHIP-REMINDERS-NO-NAG.md',
    'docs/MOB-DISC-ZERO-CHANGE-WITHOUT-APPLY.md',
    'docs/MOB-DISC-RULES-LIFE-AND-DEATH.md'
)) {
    if (Test-Path (Join-Path $AppRoot ($doc -replace '/', '\'))) { $paths += $doc }
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

foreach ($extra in @(
    'fr-sidecar/app.py',
    'fr-sidecar/requirements.txt',
    'fr-sidecar/INSTALL.ps1',
    'fr-sidecar-fast/app.py',
    'fr-sidecar-fast/requirements.txt',
    'fr-sidecar-fast/INSTALL.ps1',
    'fr-sidecar-fast/README.md',
    'fr-sidecar-seeta/app.py',
    'fr-sidecar-seeta/requirements.txt',
    'fr-sidecar-seeta/INSTALL-SEETA-LAB.ps1',
    'fr-sidecar-seeta/START-SEETA-LAB.bat',
    'fr-sidecar-seeta/README.md'
)) {
    if (Test-Path (Join-Path $AppRoot ($extra -replace '/', '\'))) { $paths += $extra }
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

$paths = @($paths | Where-Object { Test-Path (Join-Path $AppRoot ($_ -replace '/', '\')) } | Select-Object -Unique | Sort-Object)

$gitHead = ''
try {
    $gitHead = (& git -C $AppRoot rev-parse --short HEAD 2>$null)
} catch { $gitHead = '' }

Write-Host 'CREATE ME8 classic-PASS backup'
Write-Host "  FROM $AppRoot"
Write-Host "  INTO $OutRoot"
Write-Host ''

$saved = 0
$hashes = @()
$fileEntries = @()

foreach ($rel in $paths) {
    $src = Join-Path $AppRoot ($rel -replace '/', '\')
    $dst = Join-Path $OutRoot ($rel -replace '/', '\')
    $dir = Split-Path $dst -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    Copy-Item $src $dst -Force
    $sha = Get-FileSha256 $dst
    $tier = if ($rel -like 'storage/*') { 'me8-config' } elseif ($rel -eq '.env') { 'me8-env' } elseif ($rel -like 'data/gis/*') { 'me8-gis' } elseif ($rel -like 'docs/*') { 'me8-docs' } elseif ($rel -like 'docker/*') { 'me8-docker' } elseif ($rel -like 'pack/*') { 'me8-pack' } elseif ($rel -like '.cursor/*') { 'me8-cursor' } elseif ($rel -like 'fr-sidecar*') { 'me8-fr' } else { 'me8-classic-pass' }
    $hashes += [ordered]@{ path = $rel; sha256 = $sha }
    $fileEntries += [ordered]@{ path = $rel; tier = $tier }
    Write-Host "  locked $rel"
    $saved++
}

$manifest = [ordered]@{
    label = 'ME8 classic-PASS backup'
    version = 'me8-classic-pass-20260718'
    locked = '2026-07-18'
    gitCommit = $gitHead
    gitBranch = 'main'
    note = 'Classic Fleet PASS (Soft Open / lab WVP off). Call always-on, BWC-stop no callback, pin revive/dock. Floor before clean WVP/ZLM. AI restores only on RUN RESTORE-ME8-CLASSIC-PASS-20260718.'
    predecessor = 'me8-pre-gate-c-20260714'
    envClassic = @{
        FM_LAB_WVP = '0'
        FM_SOFTOPEN_WVP_ONLY = '0'
        FM_WVP_FLEET_PRESENCE = '0'
    }
    frozen = @(
        'public/index.html',
        'public/js/video-wall.js',
        'public/js/call-mic.js',
        'public/js/fleet-ui.js',
        'public/js/ptt-rx.js',
        'lib/psG711Audio.js',
        'lib/pttServer.js',
        'lib/sipServer.js',
        'lib/liveStreamPool.js',
        'public/vendor/jsmpeg.min.js'
    )
    files = $fileEntries
}
$manifest | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $OutRoot 'MANIFEST.json') -Encoding UTF8
@{ files = $hashes } | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $OutRoot 'HASHES.json') -Encoding UTF8

# Optional mirror outside repo
$backupMirror = Join-Path (Split-Path $AppRoot -Parent) 'ME8-BACKUPS\2026-07-18-classic-pass'
try {
    if (-not (Test-Path (Split-Path $backupMirror -Parent))) {
        New-Item -ItemType Directory -Force -Path (Split-Path $backupMirror -Parent) | Out-Null
    }
    if (Test-Path $backupMirror) { Remove-Item $backupMirror -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $backupMirror | Out-Null
    Copy-Item (Join-Path $OutRoot '*') $backupMirror -Recurse -Force
    Write-Host ''
    Write-Host "Also mirrored to $backupMirror"
} catch {
    Write-Host ''
    Write-Host "Mirror to ME8-BACKUPS skipped: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ''
Write-Host "ME8 classic-PASS lock: $saved files in $OutRoot"
Write-Host 'Next: .\VERIFY-ME8-CLASSIC-PASS-20260718.ps1'
