# ME8 fresh install verify — fails on lab leftovers (bench or ship folder).
param(
    [string]$AppRoot = '',
    [switch]$Quiet
)
$ErrorActionPreference = 'Stop'

$script:FailCount = 0
$script:WarnCount = 0

function Write-Ok($msg) {
    if (-not $Quiet) { Write-Host "[ok] $msg" -ForegroundColor Green }
}

function Write-Warn($msg) {
    $script:WarnCount++
    if (-not $Quiet) { Write-Host "[warn] $msg" -ForegroundColor Yellow }
}

function Write-Fail($msg) {
    $script:FailCount++
    Write-Host "[fail] $msg" -ForegroundColor Red
}

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

function Test-JsonFileHasLabBwc {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return $false }
    try {
        $j = Get-Content $Path -Raw -Encoding UTF8 | ConvertFrom-Json
        $devices = @($j.devices)
        if (-not $devices -or $devices.Count -eq 0) { return $false }
        foreach ($d in $devices) {
            $nick = [string]$d.nickname
            $cam = [string]$d.camId
            if ($nick -match '^(?i)chin|kk$') { return $true }
            if ($cam -match '34020000001329') { return $true }
        }
        if ($devices.Count -gt 0) {
            return "non-empty fleet ($($devices.Count) device(s))"
        }
    } catch {
        return 'unreadable bwc-devices.json'
    }
    return $false
}

if (-not $AppRoot) { $AppRoot = Get-Me8AppRoot -Start '' }
else { $AppRoot = (Resolve-Path $AppRoot).Path }

$manifestPath = Join-Path $AppRoot 'pack\me8-fresh\MANIFEST.json'
if (-not (Test-Path $manifestPath)) { Write-Fail 'pack\me8-fresh\MANIFEST.json missing'; exit 1 }
$manifest = Get-Content $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json

$storage = Join-Path $AppRoot 'storage'
$httpPort = 3988
if (Test-Path (Join-Path $AppRoot '.env')) {
    foreach ($line in Get-Content (Join-Path $AppRoot '.env') -Encoding UTF8) {
        if ($line -match '^\s*FM_HTTP_PORT\s*=\s*(\d+)') { $httpPort = [int]$Matches[1]; break }
        if ($line -match '^\s*PORT\s*=\s*(\d+)') { $httpPort = [int]$Matches[1] }
    }
}

if (-not (Test-Path $storage)) {
    Write-Fail 'storage/ missing — run NEW-ME8-INSTALL.ps1 first'
} else {
    Write-Ok 'storage/ present'
}

foreach ($rel in $manifest.requiredFiles) {
    $p = Join-Path $storage $rel
    if (Test-Path $p) { Write-Ok "required: $rel" }
    else { Write-Fail "missing required storage file: $rel" }
}

foreach ($rel in $manifest.forbiddenInFreshStorage) {
    $p = Join-Path $storage $rel
    if (Test-Path $p) { Write-Fail "lab leftover must not ship: storage/$rel" }
    else { Write-Ok "absent: $rel" }
}

$bwcPath = Join-Path $storage 'bwc-devices.json'
$labBwc = Test-JsonFileHasLabBwc -Path $bwcPath
if ($labBwc -eq $false) {
    Write-Ok 'bwc-devices.json empty (no lab fleet)'
} elseif ($labBwc -eq $true) {
    Write-Fail 'bwc-devices.json contains lab device fingerprints (Chin/kk/34020000001329)'
} else {
    Write-Fail "bwc-devices.json: $labBwc"
}

$usersPath = Join-Path $storage 'dashboard-users.json'
if (Test-Path $usersPath) {
    try {
        $users = @(Get-Content $usersPath -Raw -Encoding UTF8 | ConvertFrom-Json)
        $names = @($users | ForEach-Object { [string]$_.username })
        $labUsers = @($names | Where-Object { $_ -match "^(?i)ncl|nn|test$" })
        if ($labUsers.Count) {
            Write-Fail "lab dashboard users still present: $($labUsers -join ', ')"
        } elseif ($users.Count -gt 1) {
            Write-Warn "dashboard-users.json has $($users.Count) users - review before ship"
        } else {
            Write-Ok 'dashboard-users.json has no lab operator accounts'
        }
    } catch {
        Write-Fail 'dashboard-users.json unreadable'
    }
} else {
    Write-Ok 'dashboard-users.json absent (first start will seed global)'
}

$settingsPath = Join-Path $storage 'server-settings.json'
if (Test-Path $settingsPath) {
    try {
        $ss = Get-Content $settingsPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $opUrl = [string]$ss.deployment.operatorUrl
        if ($opUrl -match ':3888\b') {
            Write-Fail "operatorUrl still uses trial port 3888: $opUrl"
        } elseif ($httpPort -ne 3888 -and $opUrl -and $opUrl -notmatch ":$httpPort\b") {
            Write-Fail "operatorUrl does not match FM_HTTP_PORT $httpPort : $opUrl"
        } else {
            Write-Ok "operatorUrl matches ME8 port $httpPort"
        }
        if ($opUrl -match '192\.168\.1\.8\b') {
            Write-Fail 'operatorUrl still uses legacy trial default IP 192.168.1.8'
        }
        $rawSettings = Get-Content $settingsPath -Raw -Encoding UTF8
        if ($rawSettings -match '"password"\s*:\s*"[^"]{1,}"') {
            Write-Fail 'server-settings.json still contains inline passwords — use storage/secrets/ vault only'
        } else {
            Write-Ok 'server-settings.json has no inline passwords'
        }
    } catch {
        Write-Fail 'server-settings.json unreadable'
    }
}

$secretsPath = Join-Path $storage 'secrets\server-secrets.json'
if (Test-Path $secretsPath) {
    try {
        $rawSecrets = Get-Content $secretsPath -Raw -Encoding UTF8
        if ($rawSecrets -match '"format"\s*:\s*"me8-secrets-v2"') {
            Write-Ok 'server-secrets.json encrypted at rest'
        } elseif ($rawSecrets -match '"version"\s*:\s*1') {
            Write-Fail 'server-secrets.json is still plaintext — restart Fleet once to encrypt'
        } else {
            Write-Warn 'server-secrets.json format unrecognized'
        }
    } catch {
        Write-Fail 'server-secrets.json unreadable'
    }
} else {
    Write-Ok 'server-secrets.json not created yet (first configure or start)'
}

$envPath = Join-Path $AppRoot '.env'
if (Test-Path $envPath) {
    $envRaw = Get-Content $envPath -Raw -Encoding UTF8
    if ($envRaw -match '(?m)^FM_FTP_PASS\s*=\s*000099\s*$') {
        Write-Fail 'FM_FTP_PASS still set to lab value 000099 in .env'
    } else {
        Write-Ok 'no lab FTP password fingerprint in .env'
    }
    $seedSet = $false
    foreach ($line in ($envRaw -split "`r?`n")) {
        if ($line -match '^\s*FM_SEED_BWC_ID\s*=\s*(\S+)\s*$') {
            $seedVal = $Matches[1].Trim()
            if ($seedVal) {
                Write-Fail "FM_SEED_BWC_ID still set in .env: $seedVal"
                $seedSet = $true
            }
        }
    }
    if (-not $seedSet) { Write-Ok 'FM_SEED_BWC_ID empty in .env' }
    if ($envRaw -match '(?m)^FM_USE_CACHE_DEBOUNCE\s*=\s*1\s*$') {
        Write-Ok 'FM_USE_CACHE_DEBOUNCE=1 (ME8 ship default)'
    } else {
        Write-Warn 'FM_USE_CACHE_DEBOUNCE not set to 1 — ME8 ship profile enables debounced GPS/contact cache'
    }
} else {
    Write-Warn '.env missing - copy from .env.me8.example before ship'
}

Write-Host ''
if ($script:FailCount -gt 0) {
    Write-Host "VERIFY ME8 FRESH: FAIL ($script:FailCount issue(s))" -ForegroundColor Red
    exit 1
}
if ($script:WarnCount -gt 0 -and -not $Quiet) {
    Write-Host "VERIFY ME8 FRESH: OK with $script:WarnCount warning(s)" -ForegroundColor Yellow
} else {
    Write-Host 'VERIFY ME8 FRESH: OK' -ForegroundColor Green
}
exit 0
