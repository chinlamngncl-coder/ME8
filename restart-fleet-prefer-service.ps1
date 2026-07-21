# mob-lab-restart-fleet-prefer-service
# If Windows service UbitronC2 is installed, restart that service (elevate once if needed).
# Exit codes:
#   0 = service restarted OK (caller should NOT start console node)
#   1 = service restart failed
#   2 = service not installed - caller should use lab console path
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

function Get-DashboardPort {
    $port = 3988
    $envPath = Join-Path $PSScriptRoot '.env'
    if (Test-Path $envPath) {
        $match = Select-String -Path $envPath -Pattern '^(?:FM_HTTP_PORT|PORT)=(\d+)\s*$' |
            Select-Object -First 1
        if ($match -and $match.Matches.Count) { $port = [int]$match.Matches[0].Groups[1].Value }
    }
    return $port
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
        Write-Host "  BLOCKED: service $serviceName is PAUSED after repeated application startup failures."
        Write-Host "  This is not fixed by repeatedly clicking UAC Yes."
        $serviceLog = Join-Path $PSScriptRoot 'storage\service-stdout.log'
        if (Test-Path $serviceLog) {
            $lastStartupError = Get-Content -Path $serviceLog -Tail 80 -ErrorAction SilentlyContinue |
                Select-String -Pattern 'uncaughtException|startup|Error:' |
                Select-Object -Last 1
            if ($lastStartupError) {
                Write-Host "  Last startup error: $($lastStartupError.Line)"
            }
        }
        Write-Host "  Repair the reported startup error, then run this restart once as Administrator."
    } else {
        Write-Host "  BLOCKED: Windows did not allow the service restart."
        Write-Host "  Click Yes on the UAC box, or right-click RESTART-FLEET.bat -> Run as administrator."
    }
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
Write-Host "  Dashboard: http://localhost:$dashboardPort"
if ($stableHealth -ge 3) {
    Write-Host "  HEALTH PASS: HTTP, SIP, PTT, media, database and storage are ready."
} else {
    Write-Host "  BLOCKED: service is Running but the complete health gate did not pass."
    Write-Host "  Check storage\service-stderr.log; do not treat this restart as successful."
    exit 1
}
exit 0
