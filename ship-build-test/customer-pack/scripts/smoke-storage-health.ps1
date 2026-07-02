# Smoke test - SQLite catalog + storage paths (run after RESTART-FLEET.bat)
# Usage:
#   .\scripts\smoke-storage-health.ps1
#   .\scripts\smoke-storage-health.ps1 -BaseUrl "http://192.168.1.38:3888"
#   .\scripts\smoke-storage-health.ps1 -WriteTests
#   .\scripts\smoke-storage-health.ps1 -ScanCatalog
param(
    [string]$BaseUrl = "http://127.0.0.1:3888",
    [string]$Username = "global",
    [string]$Password = "global123",
    [switch]$WriteTests,
    [switch]$ScanCatalog
)

$ErrorActionPreference = "Stop"
$fail = 0
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Write-Pass([string]$Msg) { Write-Host "[OK]   $Msg" -ForegroundColor Green }
function Write-Fail([string]$Msg) { Write-Host "[FAIL] $Msg" -ForegroundColor Red; $script:fail++ }
function Write-Warn([string]$Msg) { Write-Host "[WARN] $Msg" -ForegroundColor Yellow }
function Write-Info([string]$Msg) { Write-Host "       $Msg" -ForegroundColor DarkGray }

Write-Host ""
Write-Host "Mobility storage smoke test"
Write-Host "  URL: $BaseUrl"
Write-Host ""

try {
    $health = Invoke-RestMethod -Uri "$BaseUrl/api/health" -TimeoutSec 15 -WebSession $session
    if (-not $health.ok) { throw "ok=false" }
    Write-Pass "GET /api/health (uptime $($health.uptimeSec)s)"
} catch {
    Write-Fail "GET /api/health - $($_.Exception.Message)"
    Write-Host ""
    Write-Host "Start the server first: .\RESTART-FLEET.bat" -ForegroundColor Yellow
    exit 1
}

try {
    $loginBody = @{ username = $Username; password = $Password } | ConvertTo-Json
    $login = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method POST `
        -ContentType "application/json" -Body $loginBody -WebSession $session -TimeoutSec 15
    if (-not $login.ok) { throw ($login.error | Out-String) }
    Write-Pass "POST /api/auth/login ($($login.username) / $($login.role))"
} catch {
    Write-Fail "POST /api/auth/login - $($_.Exception.Message)"
    exit 1
}

try {
    $st = Invoke-RestMethod -Uri "$BaseUrl/api/storage/status?disk=1" -WebSession $session -TimeoutSec 20
    if (-not $st.ok) { throw ($st.error | Out-String) }
    $cat = $st.catalog
    if (-not $cat -or $cat.engine -ne "sqlite") { throw "catalog engine not sqlite" }
    $dbKb = [math]::Round((($cat.dbFileBytes + $cat.walFileBytes) / 1024), 1)
    Write-Pass "GET /api/storage/status (SQLite catalog)"
    Write-Info ('evidence files: ' + $cat.evidenceFileCount + ' | db+wals: ' + $dbKb + ' KB | bwc devices: ' + $cat.bwcDeviceCount)
    $val = $st.validation
    if ($val) {
        $ftpOk = if ($val.ftp) { "ready" } else { "MISSING" }
        $nasOk = if ($null -eq $val.nas) { "n/a" } elseif ($val.nas) { "mounted" } else { "MISSING" }
        $tier = if ($val.networkArchive) { "IP SAN / NAS" } else { "local" }
        Write-Info "archive tier: $tier | FTP: $ftpOk | mount: $nasOk"
        if ($val.networkArchive -and -not $val.nas) {
            Write-Warn "Network archive selected but mount path not found - mount IP SAN before BWCs upload"
        }
        if (-not $val.ftp) {
            Write-Warn "FTP ingest folder missing - check Evidence -> Settings"
        }
    }
} catch {
    Write-Fail "GET /api/storage/status - $($_.Exception.Message)"
}

try {
    $ev = Invoke-RestMethod -Uri "$BaseUrl/api/evidence-settings" -WebSession $session -TimeoutSec 15
    if (-not $ev.ok) { throw ($ev.error | Out-String) }
    Write-Pass "GET /api/evidence-settings"
    Write-Info "FTP label: $($ev.ftpLabel)"
    Write-Info "live capture: $($ev.liveCaptureLabel)"
    if ($ev.networkStorage -and $ev.networkStorage.enabled -and $ev.networkStorage.recommended) {
        Write-Info "SAN recommended FTP: $($ev.networkStorage.recommended.ftp)"
    }
} catch {
    Write-Fail "GET /api/evidence-settings - $($_.Exception.Message)"
}

try {
    $tp = Invoke-RestMethod -Uri "$BaseUrl/api/evidence-settings/test-paths" -Method POST `
        -ContentType "application/json" -Body "{}" -WebSession $session -TimeoutSec 20
    if (-not $tp.ok) { throw ($tp.error | Out-String) }
    Write-Pass "POST /api/evidence-settings/test-paths"
    $v = $tp.pathValidation
    if ($v.ftpDetail -and -not $v.ftpDetail.writable -and $v.ftp) {
        Write-Warn "FTP folder exists but may not be writable by Mobility process"
    }
} catch {
    Write-Fail "POST /api/evidence-settings/test-paths - $($_.Exception.Message)"
}

if ($WriteTests) {
    try {
        $bak = Invoke-RestMethod -Uri "$BaseUrl/api/storage/backup" -Method POST `
            -WebSession $session -TimeoutSec 30
        if (-not $bak.ok) { throw ($bak.error | Out-String) }
        $bakKb = [math]::Round($bak.bytes / 1024, 1)
        Write-Pass ('POST /api/storage/backup (' + $bakKb + ' KB)')
    } catch {
        Write-Fail "POST /api/storage/backup - $($_.Exception.Message)"
    }

    try {
        $mnt = Invoke-RestMethod -Uri "$BaseUrl/api/storage/maintenance" -Method POST `
            -ContentType "application/json" -Body "{}" -WebSession $session -TimeoutSec 30
        if (-not $mnt.ok) { throw ($mnt.error | Out-String) }
        Write-Pass "POST /api/storage/maintenance (WAL checkpoint)"
    } catch {
        Write-Fail "POST /api/storage/maintenance - $($_.Exception.Message)"
    }
}

if ($ScanCatalog) {
    try {
        $scan = Invoke-RestMethod -Uri "$BaseUrl/api/evidence/scan-catalog" -Method POST `
            -ContentType "application/json" -Body "{}" -WebSession $session -TimeoutSec 120
        if (-not $scan.ok) { throw ($scan.error | Out-String) }
        Write-Pass "POST /api/evidence/scan-catalog (indexed $($scan.indexed) file(s))"
    } catch {
        Write-Fail "POST /api/evidence/scan-catalog - $($_.Exception.Message)"
    }
}

Write-Host ""
if ($fail -eq 0) {
    Write-Host "SMOKE OK - storage + SQLite checks passed." -ForegroundColor Green
    Write-Host "Next: hard refresh dashboard (Ctrl+Shift+R), then turn on BWCs." -ForegroundColor DarkGray
    exit 0
}
Write-Host "SMOKE FAILED - $fail check(s) failed. Fix before BWC hardware test." -ForegroundColor Red
exit 1
