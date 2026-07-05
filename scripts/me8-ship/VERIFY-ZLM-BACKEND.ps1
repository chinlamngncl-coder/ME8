# ZLM backend validate gate (mob-me8-zlm-backend-validate). Ubitron bench only.
param(
    [string]$AppRoot = '',
    [string]$FleetUrl = 'http://127.0.0.1:3988',
    [string]$CamId = ''
)
$ErrorActionPreference = 'Stop'

function Get-Me8AppRoot {
    param([string]$Start)
    if ($Start -and (Test-Path (Join-Path $Start 'server.js'))) { return (Resolve-Path $Start).Path }
    $here = $PSScriptRoot
    $grand = Split-Path (Split-Path $here -Parent) -Parent
    if (Test-Path (Join-Path $grand 'server.js')) { return $grand }
    throw 'ME8 AppRoot not found — pass -AppRoot'
}

if (-not $AppRoot) { $AppRoot = Get-Me8AppRoot -Start '' }
else { $AppRoot = (Resolve-Path $AppRoot).Path }

$sidecar = Join-Path $AppRoot 'scripts\me8-ship\VERIFY-ZLM-SIDECAR.ps1'
Write-Host 'Step B1 — ZLM sidecar' -ForegroundColor Cyan
& $sidecar -AppRoot $AppRoot
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$benchUrl = ($FleetUrl.TrimEnd('/')) + '/api/lab/zlm-bench'
if ($CamId) { $benchUrl += ('?camId=' + [uri]::EscapeDataString($CamId)) }

Write-Host "Step B2 — Fleet bench -> $benchUrl" -ForegroundColor Cyan
try {
    $r = Invoke-WebRequest -Uri $benchUrl -UseBasicParsing -TimeoutSec 8
    $json = $r.Content | ConvertFrom-Json
} catch {
    Write-Host "VERIFY ZLM BACKEND: FAIL ($($_.Exception.Message))" -ForegroundColor Red
    Write-Host '  Start Fleet: .\RESTART-FLEET.bat' -ForegroundColor DarkGray
    exit 1
}

if (-not $json.config.enabled) {
    Write-Host 'VERIFY ZLM BACKEND: FAIL (FM_ZLM_ENABLED / FM_LIVE_ENGINE not set in .env)' -ForegroundColor Red
    exit 1
}
if (-not $json.zlm.ok) {
    Write-Host "VERIFY ZLM BACKEND: FAIL (zlm.ok false — $($json.zlm.error))" -ForegroundColor Red
    exit 1
}

Write-Host '  config.enabled: true' -ForegroundColor Gray
Write-Host '  zlm.ok: true' -ForegroundColor Gray
Write-Host ("  test page: {0}/lab/zlm-flv-test.html" -f $FleetUrl.TrimEnd('/')) -ForegroundColor Gray

if ($CamId) {
    if (-not $json.poolLive) {
        Write-Host "VERIFY ZLM BACKEND: WARN (cam $CamId not live — start live from dashboard)" -ForegroundColor Yellow
    } elseif (-not $json.camIngest) {
        Write-Host 'VERIFY ZLM BACKEND: WARN (no ingest record — check media logs for zlm ingest attached)' -ForegroundColor Yellow
    } else {
        Write-Host ("  ingest packets: $($json.camIngest.packets)") -ForegroundColor Gray
        Write-Host ("  zlmStreamReady: $($json.camIngest.zlmStreamReady)") -ForegroundColor Gray
    }
}

Write-Host 'VERIFY ZLM BACKEND: PASS (sidecar + bench API — complete B3–B5 in zlm-flv-test.html)' -ForegroundColor Green
exit 0
