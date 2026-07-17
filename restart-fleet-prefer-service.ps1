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

function Test-DashboardPortUp {
    try {
        $hit = Get-NetTCPConnection -LocalPort 3988 -State Listen -ErrorAction SilentlyContinue |
            Select-Object -First 1
        return [bool]$hit
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
    Write-Host ""
    Write-Host "  BLOCKED: could not restart service $serviceName."
    Write-Host "  Click Yes on the UAC box, or right-click RESTART-FLEET.bat -> Run as administrator."
    Write-Host ""
    exit 1
}

$deadline = (Get-Date).AddSeconds(20)
while ((Get-Date) -lt $deadline) {
    if ((Test-ServiceRunning) -and (Test-DashboardPortUp)) { break }
    Start-Sleep -Milliseconds 500
}

if (-not (Test-ServiceRunning)) {
    Write-Host "  BLOCKED: service $serviceName is not Running after restart."
    exit 1
}

Write-Host "  Service $serviceName restarted."
Write-Host "  Dashboard: http://192.168.1.38:3988  (or http://localhost:3988)"
if (Test-DashboardPortUp) {
    Write-Host "  Port 3988 is listening."
} else {
    Write-Host "  Port 3988 not up yet - wait a few seconds then refresh browser."
}
exit 0
