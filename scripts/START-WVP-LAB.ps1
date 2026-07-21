# mob-wvp-zlm-modern-split - start modern ZLM + WVP 2.7.3 (split stack).
# Also ensures me8-zlm is up for the separate BWC / Fleet path.
# Does NOT touch Fleet wall / sipServer / PTT.
param(
    [string]$AppRoot = '',
    [switch]$SkipDockerStart
)

$ErrorActionPreference = 'Continue'
if (-not $AppRoot) { $AppRoot = Split-Path -Parent $PSScriptRoot }
if (-not (Test-Path (Join-Path $AppRoot 'server.js'))) {
    $AppRoot = 'C:\Users\user\Desktop\Enterprise Mobility\ME8'
}
Set-Location $AppRoot

function Read-DotEnvValue([string]$Key) {
    $envFile = Join-Path $AppRoot '.env'
    if (-not (Test-Path $envFile)) { return $null }
    $line = Get-Content $envFile | Where-Object { $_ -match "^\s*$Key\s*=" } | Select-Object -First 1
    if (-not $line) { return $null }
    return ($line -replace "^\s*$Key\s*=\s*", '').Trim().Trim('"').Trim("'")
}

Write-Host "=== WVP lab bringup (modern ZLM + WVP 2.7.3 split) ===" -ForegroundColor Cyan

$hostIp = Read-DotEnvValue 'HOST'
if (-not $hostIp) { $hostIp = Read-DotEnvValue 'FM_GB28181_PUBLIC_HOST' }
if (-not $hostIp -or $hostIp -eq 'YOUR_LAN_IP') { $hostIp = '192.168.1.38' }
$env:WVP_HOST_IP = $hostIp
Write-Host ("WVP_HOST / camera SIP target: {0}" -f $hostIp)

$dockerExe = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
if (-not $SkipDockerStart) {
    $dockerOk = $false
    try {
        docker info 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $dockerOk = $true }
    } catch { $dockerOk = $false }
    if (-not $dockerOk) {
        if (Test-Path $dockerExe) {
            Write-Host "Starting Docker Desktop..."
            Start-Process $dockerExe
            $deadline = (Get-Date).AddMinutes(3)
            while ((Get-Date) -lt $deadline) {
                Start-Sleep -Seconds 5
                try {
                    docker info 2>$null | Out-Null
                    if ($LASTEXITCODE -eq 0) { $dockerOk = $true; break }
                } catch { }
                Write-Host "  waiting for Docker..."
            }
        }
    }
    if (-not $dockerOk) {
        Write-Host "ERROR: Docker Desktop is not running. Start it, then re-run." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Ensuring BWC ZLM (me8-zlm) is up..."
docker compose -p me8-zlm -f (Join-Path $AppRoot 'docker\zlm.compose.yml') up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARN: me8-zlm compose failed - BWC lab ZLM may be down; WVP modern stack still starts." -ForegroundColor Yellow
}

$composeFile = Join-Path $AppRoot 'docker\wvp\docker-compose.wvp.yml'
Write-Host "Starting modern WVP stack (mysql + redis + me8-wvp-zlm + me8-wvp)..."
docker compose -p me8-wvp -f $composeFile up -d
if ($LASTEXITCODE -ne 0) { throw "WVP modern compose failed" }

Write-Host "Waiting for WVP UI..."
$ok = $false
$deadline = (Get-Date).AddMinutes(5)
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 5
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:18080" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { $ok = $true; break }
    } catch { }
    $logs = docker logs me8-wvp 2>&1 | Select-Object -Last 30
    $text = ($logs | Out-String)
    if ($text -match 'Started Wvp|Tomcat started|Netty started|设置zlm成功|MediaServer|wvp-pro') { $ok = $true; break }
    Write-Host "  still starting..."
}

Write-Host ""
if ($ok) {
    Write-Host "OK - modern WVP lab is up." -ForegroundColor Green
} else {
    Write-Host "Containers started; UI not confirmed yet. Check logs:" -ForegroundColor Yellow
    Write-Host "  docker logs me8-wvp --tail 80"
    Write-Host "  docker logs me8-wvp-zlm --tail 40"
}

Write-Host ""
Write-Host ("UI:     http://{0}:18080   (or http://127.0.0.1:18080)" -f $hostIp)
Write-Host "Login:  admin / admin"
Write-Host ("Camera SIP: {0}  port 5061  (Fleet PTT stays on 5060)" -f $hostIp)
Write-Host "Platform: domain 4401020049  id 44010200492000000001  pwd admin123"
Write-Host "Modern ZLM HTTP: http://127.0.0.1:80  (and :18088) - Track B play"
Write-Host "BWC / Fleet ZLM stays on :8080 (me8-zlm) - separate"
Write-Host "Stack: me8-wvp + me8-wvp-zlm + me8-wvp-db + me8-wvp-redis"
Write-Host "Fossil rollback: docker compose -p me8-wvp -f docker\wvp\docker-compose.wvp-fossil.yml up -d"
Write-Host ""
Write-Host "Proof: dashboard Lab tiles Play A+B, or WVP UI Devices after cams re-register on 5061."
