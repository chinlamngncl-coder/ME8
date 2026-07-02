# Stop processes listening on ME8 Mobility C2 ports (3988 lane)
$ports = @(3988, 3989, 3990, 5060, 6000, 29201, 21)
$pids = @{}
foreach ($port in $ports) {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        ForEach-Object { $pids[$_.OwningProcess] = $port }
}
if ($pids.Count -eq 0) {
    Write-Host '  No process on ports 3988/3989/3990/5060/6000/29201/21'
} else {
    foreach ($entry in $pids.GetEnumerator()) {
        Write-Host "  Stopping PID $($entry.Key) (port $($entry.Value))"
        Stop-Process -Id $entry.Key -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 2
