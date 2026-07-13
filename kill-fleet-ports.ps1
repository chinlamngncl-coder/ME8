# Stop ME8 Mobility C2 console processes on fleet ports (3988 lane).
# mob-start-safe: after kill, FAIL (exit 1) if ports still busy or UbitronC2 service still running
# so RESTART-FLEET does not start a half-dead server.
$ErrorActionPreference = 'Continue'
$ports = @(3988, 3989, 3990, 5060, 6000, 29201, 21, 2121)
$serviceName = 'UbitronC2'

function Get-ListenPids {
    $map = @{}
    foreach ($port in $ports) {
        Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
            ForEach-Object { $map[$_.OwningProcess] = $port }
    }
    return $map
}

function Test-ServiceRunning {
    try {
        $svc = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
        if ($svc -and $svc.Status -eq 'Running') { return $true }
    } catch { }
    return $false
}

# 1) Windows service fights console Start — try stop (needs Admin if Access Denied)
if (Test-ServiceRunning) {
    Write-Host "  Windows service $serviceName is RUNNING — trying to stop it..."
    try {
        Stop-Service -Name $serviceName -Force -ErrorAction Stop
        Start-Sleep -Seconds 2
        Write-Host "  Service $serviceName stopped."
    } catch {
        Write-Host ""
        Write-Host "  BLOCKED: Windows service $serviceName is still running."
        Write-Host "  Lab Start and the service cannot share the same ports."
        Write-Host ""
        Write-Host "  Do this (Administrator PowerShell):"
        Write-Host "    net stop $serviceName"
        Write-Host "  Or: Desktop KILL-FLEET-ADMIN.bat (Run as administrator)"
        Write-Host "  Then run RESTART-FLEET.bat again."
        Write-Host ""
        exit 1
    }
}

# 2) Stop console listeners + ME8 server.js from this folder
$pids = Get-ListenPids
$here = (Get-Location).Path
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.CommandLine -and $_.CommandLine -like "*$here*server.js*") {
        $pids[$_.ProcessId] = 'server.js'
    }
}

if ($pids.Count -eq 0) {
    Write-Host '  No process on ports 3988/3989/3990/5060/6000/29201/21/2121'
} else {
    foreach ($entry in $pids.GetEnumerator()) {
        Write-Host "  Stopping PID $($entry.Key) (port $($entry.Value))"
        Stop-Process -Id $entry.Key -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 2

# 3) Refuse start if anything still holds ports (elevated zombie, etc.)
$left = Get-ListenPids
if ($left.Count -gt 0 -or (Test-ServiceRunning)) {
    Write-Host ""
    Write-Host "  BLOCKED: Ports still in use — will NOT start a broken server."
    if (Test-ServiceRunning) {
        Write-Host "  Service $serviceName is still RUNNING."
    }
    foreach ($entry in $left.GetEnumerator()) {
        Write-Host "  Still listening: port $($entry.Value) PID $($entry.Key)"
    }
    Write-Host ""
    Write-Host "  Do this:"
    Write-Host "  1. Close other Mobility / Test 2 windows"
    Write-Host "  2. Admin:  net stop $serviceName"
    Write-Host "  3. Or run Desktop KILL-FLEET-ADMIN.bat as Administrator"
    Write-Host "  4. Run RESTART-FLEET.bat again"
    Write-Host ""
    exit 1
}

Write-Host '  Ports clear — safe to start.'
exit 0
