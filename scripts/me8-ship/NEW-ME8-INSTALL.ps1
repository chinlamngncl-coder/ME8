# ME8 fresh install — factory storage + bootstrap server profile (no lab leftovers). Ubitron ship desk only.
param(
    [string]$AppRoot = '',
    [string]$LanIp = '',
    [switch]$ForceEnv,
    [switch]$SkipBackup
)
$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host $msg -ForegroundColor Cyan }

function Get-Me8AppRoot {
    param([string]$Start)
    if ($Start -and (Test-Path (Join-Path $Start 'server.js'))) { return (Resolve-Path $Start).Path }
    $here = $PSScriptRoot
    $parent = Split-Path $here -Parent
    $grand = Split-Path $parent -Parent
    if (Test-Path (Join-Path $grand 'server.js')) { return $grand }
    if (Test-Path (Join-Path $parent 'server.js')) { return $parent }
    throw 'ME8 AppRoot not found — run from ME8 root or pass -AppRoot'
}

function Get-PrimaryLanIp {
    $candidates = @()
    try {
        $candidates = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object {
                $_.IPAddress -notlike '127.*' -and
                $_.IPAddress -notlike '169.254.*' -and
                $_.PrefixOrigin -ne 'WellKnown'
            } |
            Sort-Object InterfaceMetric, PrefixLength |
            Select-Object -ExpandProperty IPAddress)
    } catch { }
    if ($candidates.Count) { return $candidates[0] }
    return '127.0.0.1'
}

function Replace-Me8LanPlaceholders {
    param([string]$FilePath, [string]$Ip)
    if (-not (Test-Path $FilePath)) { return }
    $raw = Get-Content $FilePath -Raw -Encoding UTF8
    $raw = $raw -replace '__ME8_LAN_IP__', $Ip
    $raw = $raw -replace '192\.168\.1\.38', $Ip
    Set-Content $FilePath $raw -Encoding UTF8 -NoNewline
}

function Patch-EnvMe8 {
    param([string]$EnvPath, [string]$Ip)
    $raw = Get-Content $EnvPath -Raw -Encoding UTF8
    $raw = $raw -replace 'YOUR_LAN_IP', $Ip
    $raw = $raw -replace '(?m)^HOST=.*$', "HOST=$Ip"
    $raw = $raw -replace '(?m)^FM_GB28181_PUBLIC_HOST=.*$', "FM_GB28181_PUBLIC_HOST=$Ip"
    if ($raw -notmatch '(?m)^PORT=') { $raw += "`nPORT=3988`n" }
    if ($raw -notmatch '(?m)^FM_HTTP_PORT=') { $raw += "FM_HTTP_PORT=3988`n" }
    $raw = $raw -replace '(?m)^PORT=.*$', 'PORT=3988'
    $raw = $raw -replace '(?m)^FM_HTTP_PORT=.*$', 'FM_HTTP_PORT=3988'
    if ($raw -notmatch '(?m)^FM_USE_CACHE_DEBOUNCE=') {
        $raw += "`nFM_USE_CACHE_DEBOUNCE=1`nFM_GPS_CACHE_DEBOUNCE_MS=2000`nFM_CONTACT_CACHE_DEBOUNCE_MS=2000`n"
    }
    Set-Content $EnvPath $raw -Encoding UTF8 -NoNewline
}

if (-not $AppRoot) { $AppRoot = Get-Me8AppRoot -Start '' }
else {
    $AppRoot = (Resolve-Path $AppRoot).Path
    if (-not (Test-Path (Join-Path $AppRoot 'server.js'))) { throw "Not ME8 root: $AppRoot" }
}

$packRoot = Join-Path $AppRoot 'pack\me8-fresh'
$template = Join-Path $packRoot 'storage-template'
$manifestPath = Join-Path $packRoot 'MANIFEST.json'
if (-not (Test-Path $manifestPath)) { throw 'pack\me8-fresh missing - run mob-me8-pack-skeleton' }

$manifest = Get-Content $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$storage = Join-Path $AppRoot 'storage'
$httpPort = 3988

if (-not $LanIp) { $LanIp = Get-PrimaryLanIp }
Write-Step "ME8 fresh install -> $AppRoot (LAN $LanIp :$httpPort)"

if (-not $SkipBackup -and (Test-Path $storage)) {
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $backup = Join-Path $AppRoot "storage-lab-backup-$stamp"
    Write-Step "Backup lab storage -> $backup"
    Copy-Item $storage $backup -Recurse -Force
}

Write-Step 'Reset storage/ from factory template...'
New-Item -ItemType Directory -Force -Path $storage | Out-Null

foreach ($rel in $manifest.requiredFiles) {
    $src = Join-Path $template $rel
    $dst = Join-Path $storage $rel
    if (-not (Test-Path $src)) { throw "Template missing: $rel" }
    Copy-Item $src $dst -Force
    Replace-Me8LanPlaceholders -FilePath $dst -Ip $LanIp
}

$tenantPath = Join-Path $storage 'tenant-profile.json'
if (Test-Path $tenantPath) {
    $tp = Get-Content $tenantPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $tp.updatedAt = (Get-Date).ToUniversalTime().ToString('o')
    ($tp | ConvertTo-Json -Depth 8) | Set-Content $tenantPath -Encoding UTF8
}

foreach ($rel in $manifest.forbiddenInFreshStorage) {
    $p = Join-Path $storage $rel
    if (Test-Path $p) { Remove-Item $p -Recurse -Force }
}

foreach ($rel in $manifest.emptyDirs) {
    New-Item -ItemType Directory -Force -Path (Join-Path $storage $rel) | Out-Null
}

$aclScript = Join-Path $AppRoot 'scripts\me8-ship\LOCK-SECRETS-ACL.ps1'
if (Test-Path $aclScript) {
    Write-Step 'Lock storage/secrets ACL...'
    & $aclScript -AppRoot $AppRoot
}

Write-Step 'Bootstrap server profile...'
$envExample = Join-Path $AppRoot '.env.me8.example'
$envPath = Join-Path $AppRoot '.env'
if (-not (Test-Path $envExample)) { throw 'Bootstrap template missing (.env.me8.example)' }
if (-not (Test-Path $envPath) -or $ForceEnv) {
    Copy-Item $envExample $envPath -Force
    Write-Host '  Created bootstrap server profile' -ForegroundColor Gray
} else {
    Write-Host '  Kept existing bootstrap profile (use -ForceEnv to replace from template)' -ForegroundColor Yellow
}
Patch-EnvMe8 -EnvPath $envPath -Ip $LanIp

Write-Host ''
Write-Host 'ME8 FRESH INSTALL OK' -ForegroundColor Green
Write-Host "  Storage:  factory template (no lab BWCs, GPS, or users)"
Write-Host "  Operator: http://${LanIp}:$httpPort"
Write-Host '  Next:     .\RESTART-FLEET.bat'
Write-Host '  Site admin: Settings -> Server Config (see CUSTOMER-START.txt)'
Write-Host '  Ship desk:  scripts\me8-ship\VERIFY-ME8-FRESH.ps1 (Ubitron pre-handoff only)'
Write-Host ''
