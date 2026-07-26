# Snapshot live ME8 before Settings UI theme fallback (Target A).
# AI restores ONLY when user types: RUN RESTORE-ME8-PRE-SETTINGS-UI-FALLBACK
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
function Add-IfExists([System.Collections.Generic.List[string]]$List, [string]$Rel) {
    $p = Join-Path $AppRoot ($Rel -replace '/', '\')
    if (Test-Path $p) { [void]$List.Add($Rel.Replace('\', '/')) }
}

$paths = [System.Collections.Generic.List[string]]::new()
foreach ($rel in @(
    'server.js','package.json','package-lock.json','.env','.env.example','.env.me8.example','.env.enterprise.example',
    '.gitignore','RESTART-FLEET.bat','LAB-CONSOLE-START.bat','README-ME8.md',
    'BASELINE-ME8-PRE-SETTINGS-UI-FALLBACK.md','BASELINE-ME8-CLASSIC-PASS-20260718.md','BASELINE-ME8-PRE-GATE-C.md',
    'BASELINE-ME8-FIRMWARE-GOLD.md','BASELINE-ME8-V1.md','BASELINE-ME8-FAILED-LIVE-V1.md',
    'NEW-ME8-INSTALL.ps1','VERIFY-ME8-FRESH.ps1','BUILD-ME8-CUSTOMER.ps1','LOCK-SECRETS-ACL.ps1','SMOKE-COMPOSE.ps1','kill-fleet-ports.ps1',
    'CREATE-ME8-PRE-SETTINGS-UI-FALLBACK.ps1','RESTORE-ME8-PRE-SETTINGS-UI-FALLBACK.ps1','VERIFY-ME8-PRE-SETTINGS-UI-FALLBACK.ps1'
)) { Add-IfExists $paths $rel }

Get-ChildItem (Join-Path $AppRoot 'scripts') -Filter '*.ps1' -File -EA SilentlyContinue | ForEach-Object { [void]$paths.Add(('scripts/' + $_.Name)) }
Get-ChildItem (Join-Path $AppRoot 'scripts') -Filter '*.js' -File -EA SilentlyContinue | ForEach-Object { [void]$paths.Add(('scripts/' + $_.Name)) }
if (Test-Path (Join-Path $AppRoot 'scripts\country-tile-bboxes.json')) { [void]$paths.Add('scripts/country-tile-bboxes.json') }
foreach ($sub in @('me8-ship','trial-ship','lab')) {
    Get-ChildItem (Join-Path $AppRoot "scripts\$sub") -Recurse -File -EA SilentlyContinue | ForEach-Object {
        [void]$paths.Add(($_.FullName.Substring($AppRoot.Length + 1) -replace '\\','/'))
    }
}
Get-ChildItem (Join-Path $AppRoot 'docker') -File -EA SilentlyContinue | ForEach-Object { [void]$paths.Add(('docker/' + $_.Name)) }
Get-ChildItem (Join-Path $AppRoot 'docker\wvp') -Recurse -File -EA SilentlyContinue | ForEach-Object {
    $rel = $_.FullName.Substring($AppRoot.Length + 1) -replace '\\','/'
    if ($rel -notmatch 'node_modules|\.git/') { [void]$paths.Add($rel) }
}
Get-ChildItem (Join-Path $AppRoot 'lib') -Filter '*.js' -File | ForEach-Object { [void]$paths.Add(('lib/' + $_.Name)) }
Get-ChildItem (Join-Path $AppRoot 'lib') -Directory -EA SilentlyContinue | ForEach-Object {
    Get-ChildItem $_.FullName -Recurse -File -Include '*.js','*.json','*.md' -EA SilentlyContinue | ForEach-Object {
        $rel = $_.FullName.Substring($AppRoot.Length + 1) -replace '\\','/'
        if ($rel -notmatch 'node_modules') { [void]$paths.Add($rel) }
    }
}
Get-ChildItem (Join-Path $AppRoot 'tools') -Recurse -File -EA SilentlyContinue | ForEach-Object {
    $rel = $_.FullName.Substring($AppRoot.Length + 1) -replace '\\','/'
    if ($rel -notmatch 'node_modules') { [void]$paths.Add($rel) }
}
Get-ChildItem (Join-Path $AppRoot 'db') -Recurse -File -EA SilentlyContinue | ForEach-Object {
    [void]$paths.Add(($_.FullName.Substring($AppRoot.Length + 1) -replace '\\','/'))
}
foreach ($h in @('public/index.html','public/login.html','public/live.html','public/matrix.html','public/command-centre.html','public/command-wall.html','public/test-zlm.html','public/test-seeta.html','public/legal-notices.html')) { Add-IfExists $paths $h }
Get-ChildItem (Join-Path $AppRoot 'public/css') -Filter '*.css' -File -EA SilentlyContinue | ForEach-Object { [void]$paths.Add(('public/css/' + $_.Name)) }
Get-ChildItem (Join-Path $AppRoot 'public/assets') -Recurse -File -EA SilentlyContinue | ForEach-Object { [void]$paths.Add(($_.FullName.Substring($AppRoot.Length + 1) -replace '\\','/')) }
Get-ChildItem (Join-Path $AppRoot 'public/locales') -Filter '*.json' -File -EA SilentlyContinue | ForEach-Object { [void]$paths.Add(('public/locales/' + $_.Name)) }
Get-ChildItem (Join-Path $AppRoot 'public/js') -Filter '*.js' -File | ForEach-Object { [void]$paths.Add(('public/js/' + $_.Name)) }
Get-ChildItem (Join-Path $AppRoot 'public/vendor') -Recurse -File -EA SilentlyContinue | ForEach-Object { [void]$paths.Add(($_.FullName.Substring($AppRoot.Length + 1) -replace '\\','/')) }
Get-ChildItem (Join-Path $AppRoot 'data/gis/offline') -Recurse -File -EA SilentlyContinue | ForEach-Object { [void]$paths.Add(($_.FullName.Substring($AppRoot.Length + 1) -replace '\\','/')) }
foreach ($pat in @('MOB-APPLIED*.md','MOB-DISC*.md','ME8-*.md','BASELINE*.md','LICENSE*.md')) {
    Get-ChildItem (Join-Path $AppRoot 'docs') -Filter $pat -File -EA SilentlyContinue | ForEach-Object { [void]$paths.Add(('docs/' + $_.Name)) }
}
foreach ($doc in @('docs/LAB-8BWC-README.md','docs/LICENSE-OPERATIONS.md','docs/ME8-POST-RESTORE-CHECKLIST.md')) { Add-IfExists $paths $doc }
Get-ChildItem (Join-Path $AppRoot 'pack/me8-fresh') -Recurse -File -EA SilentlyContinue | ForEach-Object { [void]$paths.Add(($_.FullName.Substring($AppRoot.Length + 1) -replace '\\','/')) }
Get-ChildItem (Join-Path $AppRoot 'pack/me8-ship') -Recurse -File -EA SilentlyContinue | ForEach-Object { [void]$paths.Add(($_.FullName.Substring($AppRoot.Length + 1) -replace '\\','/')) }
Get-ChildItem (Join-Path $AppRoot '.cursor/rules') -Filter '*.mdc' -File -EA SilentlyContinue | ForEach-Object { [void]$paths.Add(('.cursor/rules/' + $_.Name)) }
foreach ($extra in @(
    'fr-sidecar/app.py','fr-sidecar/requirements.txt','fr-sidecar/INSTALL.ps1',
    'fr-sidecar-fast/app.py','fr-sidecar-fast/requirements.txt','fr-sidecar-fast/INSTALL.ps1','fr-sidecar-fast/README.md',
    'fr-sidecar-seeta/app.py','fr-sidecar-seeta/requirements.txt','fr-sidecar-seeta/INSTALL-SEETA-LAB.ps1','fr-sidecar-seeta/START-SEETA-LAB.bat','fr-sidecar-seeta/README.md'
)) { Add-IfExists $paths $extra }
$androidRoot = Join-Path $AppRoot 'android\bwc-companion-f4-proof'
if (Test-Path $androidRoot) {
    Get-ChildItem $androidRoot -Recurse -File -EA SilentlyContinue | ForEach-Object {
        $rel = $_.FullName.Substring($AppRoot.Length + 1) -replace '\\','/'
        if ($rel -notmatch '/build/|\.gradle/|\.idea/') { [void]$paths.Add($rel) }
    }
}
foreach ($rel in @(
    'storage/dashboard-users.json','storage/dispatch-groups.json','storage/server-settings.json','storage/dock-registry.json',
    'storage/tenant-profile.json','storage/bwc-devices.json','storage/video-channels.json','storage/conference-state.json',
    'storage/conference-settings.json','storage/mobility.db','storage/platform-license.json','storage/license.lic'
)) { Add-IfExists $paths $rel }

# Never overwrite SNAP scripts in OutRoot with root wrappers of the same basename
$skipOverwrite = @(
    'CREATE-ME8-PRE-SETTINGS-UI-FALLBACK-SNAP.ps1',
    'RESTORE-ME8-PRE-SETTINGS-UI-FALLBACK-SNAP.ps1',
    'VERIFY-ME8-PRE-SETTINGS-UI-FALLBACK-SNAP.ps1'
)

$pathList = @($paths | Where-Object { Test-Path (Join-Path $AppRoot ($_ -replace '/', '\')) } | Select-Object -Unique | Sort-Object)
$gitHead = ''; $gitBranch = ''
try { $gitHead = (& git -C $AppRoot rev-parse --short HEAD 2>$null); $gitBranch = (& git -C $AppRoot rev-parse --abbrev-ref HEAD 2>$null) } catch {}

Write-Host 'CREATE ME8 pre-Settings-UI-fallback backup'
Write-Host "  FROM $AppRoot"; Write-Host "  INTO $OutRoot"; Write-Host ''

$saved = 0; $hashes = @(); $fileEntries = @()
foreach ($rel in $pathList) {
    $baseName = Split-Path $rel -Leaf
    if ($skipOverwrite -contains $baseName) { continue }
    $src = Join-Path $AppRoot ($rel -replace '/', '\')
    $dst = Join-Path $OutRoot ($rel -replace '/', '\')
    $dir = Split-Path $dst -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    Copy-Item $src $dst -Force
    $sha = Get-FileSha256 $dst
    $tier = if ($rel -like 'storage/*') { 'me8-config' } elseif ($rel -eq '.env') { 'me8-env' } elseif ($rel -like 'docs/*') { 'me8-docs' } elseif ($rel -like 'tools/*') { 'me8-tools' } elseif ($rel -like 'db/*') { 'me8-db' } elseif ($rel -like 'android/*') { 'me8-android' } elseif ($rel -like '.cursor/*') { 'me8-cursor' } else { 'me8-pre-settings-ui-fallback' }
    $hashes += [ordered]@{ path = $rel; sha256 = $sha }
    $fileEntries += [ordered]@{ path = $rel; tier = $tier }
    $saved++; if (($saved % 200) -eq 0) { Write-Host "  ... $saved files" }
}

# Include SNAP scripts that live in this folder
foreach ($snap in $skipOverwrite) {
    $snapPath = Join-Path $OutRoot $snap
    if (Test-Path $snapPath) {
        $sha = Get-FileSha256 $snapPath
        $hashes += [ordered]@{ path = $snap; sha256 = $sha }
        $fileEntries += [ordered]@{ path = $snap; tier = 'me8-pre-settings-ui-fallback' }
        $saved++
        Write-Host "  locked $snap (SNAP)"
    }
}

$manifest = [ordered]@{
    label = 'ME8 pre-Settings-UI-fallback backup'
    version = 'me8-pre-settings-ui-fallback-20260726'
    locked = '2026-07-26'
    gitCommit = "$gitHead"
    gitBranch = "$gitBranch"
    note = 'Full functional checkpoint BEFORE Target A Settings UI theme fallback (2026-07-23 unify). AI restores only on RUN RESTORE-ME8-PRE-SETTINGS-UI-FALLBACK.'
    predecessor = 'me8-classic-pass-20260718'
    purpose = 'Safety net so Settings UI-only Target A cannot erase non-UI progress.'
    nextPlanned = 'SETTINGS-UI-THEME-FALLBACK-PRE-SAAS-CSS-V1 (Target A)'
    frozen = @('public/index.html','public/css/settings-theme-unify.css','public/js/server-setup.js','lib/deploymentMode.js','lib/licenseManager.js','server.js')
    files = $fileEntries
}
$manifest | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $OutRoot 'MANIFEST.json') -Encoding UTF8
@{ version = $manifest.version; locked = $manifest.locked; files = $hashes } | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $OutRoot 'HASHES.json') -Encoding UTF8

$backupMirror = Join-Path (Split-Path $AppRoot -Parent) 'ME8-BACKUPS\2026-07-26-pre-settings-ui-fallback'
try {
    if (-not (Test-Path (Split-Path $backupMirror -Parent))) { New-Item -ItemType Directory -Force -Path (Split-Path $backupMirror -Parent) | Out-Null }
    if (Test-Path $backupMirror) { Remove-Item $backupMirror -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $backupMirror | Out-Null
    Copy-Item (Join-Path $OutRoot '*') $backupMirror -Recurse -Force
    Write-Host ''; Write-Host "Also mirrored to $backupMirror"
} catch { Write-Host "Mirror skipped: $($_.Exception.Message)" -ForegroundColor Yellow }

Write-Host ''; Write-Host "ME8 pre-Settings-UI-fallback lock: $saved files in $OutRoot"
Write-Host 'Next: .\VERIFY-ME8-PRE-SETTINGS-UI-FALLBACK.ps1'
