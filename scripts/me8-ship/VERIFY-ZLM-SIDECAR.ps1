# Verify ZLM sidecar health (mob-me8-zlm-sidecar). Ubitron bench / ship desk.
param(
    [string]$AppRoot = '',
    [string]$HttpUrl = '',
    [string]$Secret = ''
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

if (-not $HttpUrl -or -not $Secret) {
    $envPath = Join-Path $AppRoot '.env'
    if (Test-Path $envPath) {
        Get-Content $envPath -Encoding UTF8 | ForEach-Object {
            $t = $_.Trim()
            if ($t -match '^FM_ZLM_HTTP_URL=(.+)$' -and -not $HttpUrl) { $HttpUrl = $matches[1].Trim() }
            if ($t -match '^FM_ZLM_SECRET=(.+)$' -and -not $Secret) { $Secret = $matches[1].Trim() }
        }
    }
}

if (-not $HttpUrl) { $HttpUrl = 'http://127.0.0.1:8080' }
$probe = ($HttpUrl.TrimEnd('/')) + '/index/api/getServerConfig'
if ($Secret) { $probe += ('?secret=' + [uri]::EscapeDataString($Secret)) }

Write-Host "ZLM verify -> $probe" -ForegroundColor Cyan
try {
    $r = Invoke-WebRequest -Uri $probe -UseBasicParsing -TimeoutSec 5
    $json = $r.Content | ConvertFrom-Json
    if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 300 -and ($json.code -eq 0 -or $null -eq $json.code)) {
        Write-Host 'VERIFY ZLM SIDECAR: PASS' -ForegroundColor Green
        if ($json.data.general.mediaServerVersion) {
            Write-Host "  version: $($json.data.general.mediaServerVersion)" -ForegroundColor Gray
        }
        exit 0
    }
    Write-Host "VERIFY ZLM SIDECAR: FAIL (api code $($json.code))" -ForegroundColor Red
    exit 1
} catch {
    Write-Host "VERIFY ZLM SIDECAR: FAIL ($($_.Exception.Message))" -ForegroundColor Red
    Write-Host '  Start: docker compose -f docker/zlm.compose.yaml up -d' -ForegroundColor DarkGray
    Write-Host '  Or:    scripts\me8-ship\Start-Me8ZlmSidecar.ps1' -ForegroundColor DarkGray
    exit 1
}
