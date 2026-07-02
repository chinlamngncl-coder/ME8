# Scale staging — pre-flight and metrics snapshot
param(
    [switch]$Preflight,
    [switch]$Watch,
    [int]$IntervalSec = 60,
    [string]$BaseUrl = "http://127.0.0.1:3888"
)

$ErrorActionPreference = "Stop"

function Get-MetricValue {
    param([string]$Text, [string]$Name)
    $m = [regex]::Match($Text, "(?m)^$Name\s+(\S+)")
    if ($m.Success) { return $m.Groups[1].Value }
    return $null
}

function Test-StagingHealth {
    try {
        $health = Invoke-RestMethod -Uri "$BaseUrl/api/health" -TimeoutSec 10
        if (-not $health.ok) { throw "health not ok" }
        Write-Host "[OK] health uptimeSec=$($health.uptimeSec)"
    } catch {
        Write-Host "[FAIL] /api/health — $($_.Exception.Message)"
        return $false
    }

    try {
        $metrics = Invoke-WebRequest -Uri "$BaseUrl/api/metrics" -TimeoutSec 10 -UseBasicParsing
        $body = $metrics.Content
        $sip = Get-MetricValue $body "mobility_sip_listener_ready"
        $live = Get-MetricValue $body "mobility_live_streams"
        $rss = Get-MetricValue $body "mobility_memory_rss_bytes"
        Write-Host "[OK] metrics sip_ready=$sip live_streams=$live rss_bytes=$rss"
        if ($sip -ne "1") {
            Write-Host "[WARN] SIP listener not ready"
        }
    } catch {
        Write-Host "[FAIL] /api/metrics — $($_.Exception.Message)"
        return $false
    }
    return $true
}

if ($Preflight) {
    Write-Host "=== Scale staging pre-flight ==="
    Write-Host "BaseUrl: $BaseUrl"
    $ok = Test-StagingHealth
    if ($ok) {
        Write-Host "Pre-flight PASS — see docs/SCALE-READINESS-CERTIFICATE.md"
        exit 0
    }
    exit 1
}

if ($Watch) {
    Write-Host "=== Watching metrics every ${IntervalSec}s (Ctrl+C to stop) ==="
    while ($true) {
        Write-Host "--- $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ---"
        Test-StagingHealth | Out-Null
        Start-Sleep -Seconds $IntervalSec
    }
}

Write-Host "Usage:"
Write-Host "  .\scripts\scale-staging-cert.ps1 -Preflight"
Write-Host "  .\scripts\scale-staging-cert.ps1 -Watch"
Write-Host "  .\scripts\scale-staging-cert.ps1 -BaseUrl http://192.168.1.38:3888 -Preflight"
