# mob-lab-restart-fleet-prefer-service
# If Windows service UbitronC2 is installed, restart that service (elevate once if needed).
# Exit codes:
#   0 = service restarted OK (caller should NOT start console node)
#   1 = service restart failed
#   2 = service not installed - caller should use lab console path
# RESTART-HEALTH-PRINT-HTTPS-4438-V1 — print HTTPS primary when enabled
param(
    [switch]$PrintUrlsOnly
)
$ErrorActionPreference = 'Continue'
$serviceName = 'UbitronC2'

function Get-ServiceOrNull {
    try {
        return Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    } catch {
        return $null
    }
}

function Test-ServiceRunning {
    $svc = Get-ServiceOrNull
    return [bool]($svc -and $svc.Status -eq 'Running')
}

function Get-EnvFileValue([string]$Name) {
    $envPath = Join-Path $PSScriptRoot '.env'
    if (-not (Test-Path $envPath)) { return $null }
    $pattern = '^\s*' + [regex]::Escape($Name) + '\s*=\s*(.+?)\s*$'
    $match = Select-String -Path $envPath -Pattern $pattern | Select-Object -First 1
    if (-not $match) { return $null }
    $raw = $match.Matches[0].Groups[1].Value.Trim()
    if ($raw.StartsWith('"') -and $raw.EndsWith('"')) { $raw = $raw.Substring(1, $raw.Length - 2) }
    if ($raw.StartsWith("'") -and $raw.EndsWith("'")) { $raw = $raw.Substring(1, $raw.Length - 2) }
    return $raw
}

function Get-DashboardPort {
    $port = 3988
    $fromEnv = Get-EnvFileValue 'FM_HTTP_PORT'
    if (-not $fromEnv) { $fromEnv = Get-EnvFileValue 'PORT' }
    if ($fromEnv -match '^\d+$') { $port = [int]$fromEnv }
    return $port
}

function Get-HttpsDashboardPort {
    $port = 4438
    $fromEnv = Get-EnvFileValue 'FM_HTTPS_PORT'
    if ($fromEnv -match '^\d+$') { $port = [int]$fromEnv }
    return $port
}

function Test-HttpsDashboardEnabled {
    $flag = Get-EnvFileValue 'FM_HTTPS_ENABLED'
    if (-not $flag) { return $false }
    $v = $flag.Trim().ToLowerInvariant()
    return ($v -eq '1' -or $v -eq 'true' -or $v -eq 'yes' -or $v -eq 'on')
}

function Get-LabLanIPv4 {
    $forced = Get-EnvFileValue 'FM_HTTPS_LAN_IP'
    if ($forced -and $forced -match '^\d{1,3}(\.\d{1,3}){3}$') { return $forced }
    $helper = Join-Path $PSScriptRoot 'scripts\Get-UbitronPreferredLanIPv4.ps1'
    if (Test-Path $helper) {
        try {
            . $helper
            if (Get-Command Get-UbitronPreferredLanIPv4 -ErrorAction SilentlyContinue) {
                $ip = Get-UbitronPreferredLanIPv4
                if ($ip -and $ip -match '^\d{1,3}(\.\d{1,3}){3}$') { return $ip }
            }
        } catch {
            # fall through
        }
    }
    try {
        $row = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object {
                $_.IPAddress -notlike '127.*' -and
                $_.IPAddress -notlike '169.254.*' -and
                $_.IPAddress -notlike '172.1[7-9].*' -and
                $_.IPAddress -notlike '172.2[0-9].*' -and
                $_.IPAddress -notlike '172.3[0-1].*'
            } |
            Sort-Object -Property InterfaceMetric, PrefixLength |
            Select-Object -First 1
        if ($row -and $row.IPAddress) { return $row.IPAddress }
    } catch {
        # fall through
    }
    return '192.168.1.38'
}

function Write-DashboardOpenUrls {
    $httpPort = Get-DashboardPort
    $lan = Get-LabLanIPv4
    $httpsOn = Test-HttpsDashboardEnabled
    $httpsPort = Get-HttpsDashboardPort
    if ($httpsOn) {
        Write-Host "  Open dashboard (primary HTTPS): https://${lan}:$httpsPort"
        Write-Host "  HTTP fallback:                 http://${lan}:$httpPort"
        Write-Host "  Localhost HTTP:                http://localhost:$httpPort"
    } else {
        Write-Host "  Open dashboard: http://${lan}:$httpPort"
        Write-Host "  Localhost:      http://localhost:$httpPort"
    }
}

if ($PrintUrlsOnly) {
    Write-DashboardOpenUrls
    exit 0
}

function Test-DashboardPortUp([int]$Port) {
    try {
        $hit = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
            Select-Object -First 1
        return [bool]$hit
    } catch {
        return $false
    }
}

function Test-PlatformHealth([int]$Port) {
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 5
        return [bool]($health.ok -and $health.dashboard.httpReady -and $health.dashboard.sipReady `
            -and $health.dashboard.pttReady -and $health.dashboard.poolReady `
            -and $health.dashboard.databaseReady -and $health.dashboard.storageWritable)
    } catch {
        return $false
    }
}

$svc = Get-ServiceOrNull
if (-not $svc) {
    Write-Host "  No Windows service $serviceName - using lab console start."
    exit 2
}

Write-Host "  Found Windows service $serviceName - preferring service restart (ship/lab same path)."
Write-Host "  If a Windows YES box appears, click Yes once."

$restartCmd = @"
`$ErrorActionPreference = 'Stop'
try {
  Stop-Service -Name '$serviceName' -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
  Start-Service -Name '$serviceName'
  Start-Sleep -Seconds 2
  `$s = Get-Service -Name '$serviceName'
  if (`$s.Status -ne 'Running') { exit 1 }
  exit 0
} catch {
  exit 1
}
"@

$ok = $false
try {
    Stop-Service -Name $serviceName -Force -ErrorAction Stop
    Start-Sleep -Seconds 2
    Start-Service -Name $serviceName -ErrorAction Stop
    Start-Sleep -Seconds 2
    if (Test-ServiceRunning) { $ok = $true }
} catch {
    $ok = $false
}

if (-not $ok) {
    try {
        $p = Start-Process -FilePath 'powershell.exe' -Verb RunAs -Wait -PassThru -ArgumentList @(
            '-NoProfile',
            '-ExecutionPolicy', 'Bypass',
            '-Command', $restartCmd
        )
        if ($p -and $p.ExitCode -eq 0 -and (Test-ServiceRunning)) {
            $ok = $true
        }
    } catch {
        $ok = $false
    }
}

if (-not $ok) {
    $failedState = Get-ServiceOrNull
    Write-Host ""
    if ($failedState -and $failedState.Status -eq 'Paused') {
        Write-Host "  BLOCKED: service $serviceName is PAUSED (app crashed on startup repeatedly)."
        Write-Host "  This is NOT ports, HTTPS, or localhost."
        Write-Host "  This is NOT fixed by repeatedly clicking UAC Yes."
        $stderrLog = Join-Path $PSScriptRoot 'storage\service-stderr.log'
        $stdoutLog = Join-Path $PSScriptRoot 'storage\service-stdout.log'
        $lastLine = $null
        foreach ($logPath in @($stderrLog, $stdoutLog)) {
            if (-not (Test-Path $logPath)) { continue }
            $hit = Get-Content -Path $logPath -Tail 120 -ErrorAction SilentlyContinue |
                Select-String -Pattern 'SyntaxError|uncaughtException|Error:|FATAL|Cannot find module' |
                Select-Object -Last 1
            if ($hit) { $lastLine = $hit.Line; break }
        }
        if ($lastLine) {
            Write-Host "  Last startup error: $lastLine"
        } else {
            Write-Host "  Check storage\service-stderr.log and storage\service-stdout.log"
        }
        Write-Host "  Fix the code/config crash, then Run as administrator ONCE to clear Paused."
        Write-Host ""
        exit 3
    }
    Write-Host "  BLOCKED: Windows did not allow the service restart (permission / UAC)."
    Write-Host "  Click Yes on the UAC box, or right-click RESTART-FLEET.bat -> Run as administrator."
    Write-Host ""
    exit 1
}

$dashboardPort = Get-DashboardPort
$deadline = (Get-Date).AddSeconds(30)
$stableHealth = 0
while ((Get-Date) -lt $deadline) {
    if ((Test-ServiceRunning) -and (Test-DashboardPortUp -Port $dashboardPort) `
        -and (Test-PlatformHealth -Port $dashboardPort)) {
        $stableHealth += 1
        if ($stableHealth -ge 3) { break }
    } else {
        $stableHealth = 0
    }
    Start-Sleep -Milliseconds 500
}

if (-not (Test-ServiceRunning)) {
    Write-Host "  BLOCKED: service $serviceName is not Running after restart."
    exit 1
}

Write-Host "  Service $serviceName restarted."
if ($stableHealth -ge 3) {
    Write-Host "  HEALTH PASS: HTTP, SIP, PTT, media, database and storage are ready."
    Write-DashboardOpenUrls
} else {
    Write-Host "  BLOCKED: service is Running but the complete health gate did not pass."
    Write-Host "  Check storage\service-stderr.log; do not treat this restart as successful."
    exit 1
}
exit 0
