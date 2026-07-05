# Stop processes listening on ME8 Mobility C2 ports (3988 lane) + ZLM sidecar
$ports = @(3988, 3989, 3990, 5060, 6000, 29201, 21, 8080, 554, 1935)
$pids = @{}
foreach ($port in $ports) {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        ForEach-Object { $pids[$_.OwningProcess] = $port }
}
$here = $PSScriptRoot
if (-not $here) { $here = (Get-Location).Path }
$pidFile = Join-Path $here 'storage\zlm-sidecar.pid'
if (Test-Path $pidFile) {
    try {
        $zlmPid = [int](Get-Content $pidFile -Raw).Trim()
        if ($zlmPid -gt 0) {
            $pids[$zlmPid] = 'zlm'
        }
    } catch { }
}
if ($pids.Count -eq 0) {
    Write-Host '  No process on Fleet/ZLM ports'
} else {
    foreach ($entry in $pids.GetEnumerator()) {
        Write-Host "  Stopping PID $($entry.Key) (port $($entry.Value))"
        Stop-Process -Id $entry.Key -Force -ErrorAction SilentlyContinue
    }
}
if (Test-Path $pidFile) {
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2
