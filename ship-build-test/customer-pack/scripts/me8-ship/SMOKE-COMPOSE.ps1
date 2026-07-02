# ME8 Docker compose smoke — enterprise Valkey/Postgres (+ optional LiveKit).
param(
    [string]$AppRoot = '',
    [switch]$IncludeLiveKit,
    [switch]$LeaveRunning,
    [switch]$Quiet
)
$ErrorActionPreference = 'Stop'

$script:FailCount = 0

function Write-Ok($msg) {
    if (-not $Quiet) { Write-Host "[ok] $msg" -ForegroundColor Green }
}

function Write-Fail($msg) {
    $script:FailCount++
    Write-Host "[fail] $msg" -ForegroundColor Red
}

function Get-Me8AppRoot {
    param([string]$Start)
    if ($Start -and (Test-Path (Join-Path $Start 'server.js'))) { return (Resolve-Path $Start).Path }
    $here = $PSScriptRoot
    $grand = Split-Path (Split-Path $here -Parent) -Parent
    if (Test-Path (Join-Path $grand 'server.js')) { return $grand }
    throw 'ME8 AppRoot not found — run from ME8 root or pass -AppRoot'
}

function Test-DockerCli {
    try {
        $v = docker version --format '{{.Server.Version}}' 2>$null
        return [bool]$v
    } catch {
        return $false
    }
}

function Wait-Healthy {
    param([string]$Container, [int]$TimeoutSec = 90)
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        $state = docker inspect -f '{{.State.Health.Status}}' $Container 2>$null
        if ($state -eq 'healthy') { return $true }
        if ($state -eq 'unhealthy') { return $false }
        Start-Sleep -Seconds 2
    }
    return $false
}

if (-not $AppRoot) { $AppRoot = Get-Me8AppRoot -Start '' }
else { $AppRoot = (Resolve-Path $AppRoot).Path }

if (-not (Test-DockerCli)) {
    Write-Fail 'Docker CLI not available or daemon not running'
    exit 1
}
Write-Ok 'Docker CLI available'

$entCompose = Join-Path $AppRoot 'docker\docker-compose.enterprise.yml'
if (-not (Test-Path $entCompose)) {
    Write-Fail "Missing $entCompose"
    exit 1
}

Push-Location $AppRoot
try {
    docker compose -f docker/docker-compose.enterprise.yml up -d | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Fail 'enterprise compose up failed'
    } else {
        Write-Ok 'enterprise compose started'
    }

    if (Wait-Healthy -Container 'mobility-valkey') {
        $ping = docker exec mobility-valkey valkey-cli ping 2>$null
        if ($ping -match 'PONG') { Write-Ok 'Valkey PING' }
        else { Write-Fail "Valkey PING returned: $ping" }
    } else {
        Write-Fail 'mobility-valkey not healthy'
    }

    if (Wait-Healthy -Container 'mobility-postgres') {
        $ready = docker exec mobility-postgres pg_isready -U mobility -d mobility 2>$null
        if ($ready -match 'accepting connections') { Write-Ok 'Postgres pg_isready' }
        else { Write-Fail "Postgres not ready: $ready" }
    } else {
        Write-Fail 'mobility-postgres not healthy'
    }

    if ($IncludeLiveKit) {
        $lkCompose = Join-Path $AppRoot 'docker\livekit.compose.yaml'
        if (-not (Test-Path $lkCompose)) {
            Write-Fail 'livekit.compose.yaml missing'
        } else {
            $startScript = Join-Path $AppRoot 'scripts\START-LIVEKIT.ps1'
            if (Test-Path $startScript) {
                & $startScript
            } else {
                Push-Location (Join-Path $AppRoot 'docker')
                docker compose -f livekit.compose.yaml up -d --force-recreate | Out-Null
                Pop-Location
            }
            Start-Sleep -Seconds 8
            try {
                $r = Invoke-WebRequest -Uri 'http://127.0.0.1:7880' -UseBasicParsing -TimeoutSec 10
                if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) {
                    Write-Ok 'LiveKit HTTP :7880 reachable'
                } else {
                    Write-Fail "LiveKit HTTP status $($r.StatusCode)"
                }
            } catch {
                Write-Fail "LiveKit HTTP probe failed: $($_.Exception.Message)"
            }
        }
    }

    if (-not $LeaveRunning) {
        if ($IncludeLiveKit) {
            Push-Location (Join-Path $AppRoot 'docker')
            docker compose -f livekit.compose.yaml down 2>$null | Out-Null
            Pop-Location
        }
        docker compose -f docker/docker-compose.enterprise.yml down 2>$null | Out-Null
        if (-not $Quiet) { Write-Host 'Compose stacks stopped (use -LeaveRunning to keep up)' -ForegroundColor Gray }
    } else {
        Write-Ok 'Stacks left running (-LeaveRunning)'
    }
} finally {
    Pop-Location
}

Write-Host ''
if ($script:FailCount -gt 0) {
    Write-Host "SMOKE-COMPOSE: FAIL ($script:FailCount issue(s))" -ForegroundColor Red
    exit 1
}
Write-Host 'SMOKE-COMPOSE: OK' -ForegroundColor Green
exit 0
