# Start ZLMediaKit sidecar if configured (mob-me8-zlm-sidecar). Ubitron internal.
param(
    [string]$AppRoot = ''
)
$ErrorActionPreference = 'Stop'

function Read-DotEnvLine {
    param([hashtable]$Map, [string]$Line)
    $t = $Line.Trim()
    if (-not $t -or $t.StartsWith('#')) { return }
    $eq = $t.IndexOf('=')
    if ($eq -lt 1) { return }
    $k = $t.Substring(0, $eq).Trim()
    $v = $t.Substring($eq + 1).Trim()
    if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1, $v.Length - 2) }
    $Map[$k] = $v
}

function Get-Me8AppRoot {
    param([string]$Start)
    if ($Start -and (Test-Path (Join-Path $Start 'server.js'))) { return (Resolve-Path $Start).Path }
    $here = $PSScriptRoot
    $grand = Split-Path (Split-Path $here -Parent) -Parent
    if (Test-Path (Join-Path $grand 'server.js')) { return $grand }
    throw 'ME8 AppRoot not found'
}

function Test-ZlmHttp {
    param([string]$Url, [string]$Secret)
    $probe = ($Url.TrimEnd('/')) + '/index/api/getServerConfig'
    if ($Secret) { $probe += ('?secret=' + [uri]::EscapeDataString($Secret)) }
    try {
        $r = Invoke-WebRequest -Uri $probe -UseBasicParsing -TimeoutSec 3
        if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 300) { return $true }
    } catch { }
    return $false
}

if (-not $AppRoot) { $AppRoot = Get-Me8AppRoot -Start '' }
else { $AppRoot = (Resolve-Path $AppRoot).Path }

$envMap = @{}
$envPath = Join-Path $AppRoot '.env'
if (Test-Path $envPath) {
    Get-Content $envPath -Encoding UTF8 | ForEach-Object { Read-DotEnvLine -Map $envMap -Line $_ }
}

$liveEngine = if ($envMap['FM_LIVE_ENGINE']) { $envMap['FM_LIVE_ENGINE'] } else { 'ffmpeg' }
$zlmEnabled = ($envMap['FM_ZLM_ENABLED'] -eq '1') -or ($liveEngine -eq 'zlm')
$autostart = $envMap['FM_ZLM_AUTOSTART'] -ne '0'

if (-not $zlmEnabled -or -not $autostart) { exit 0 }

$httpUrl = if ($envMap['FM_ZLM_HTTP_URL']) { $envMap['FM_ZLM_HTTP_URL'] } else { 'http://127.0.0.1:8080' }
$secret = $envMap['FM_ZLM_SECRET']
$binRel = if ($envMap['FM_ZLM_BIN']) { $envMap['FM_ZLM_BIN'] } else { 'vendor\zlm\MediaServer.exe' }
$configRel = if ($envMap['FM_ZLM_CONFIG']) { $envMap['FM_ZLM_CONFIG'] } else { 'vendor\zlm\config.ini' }

if (Test-ZlmHttp -Url $httpUrl -Secret $secret) {
    Write-Host '  ZLM sidecar already responding' -ForegroundColor DarkGray
    exit 0
}

$binPath = Join-Path $AppRoot $binRel
$configPath = Join-Path $AppRoot $configRel
if (-not (Test-Path $binPath)) {
    Write-Host '  ZLM: binary not found — skipped (place MediaServer or use docker/zlm.compose.yaml)' -ForegroundColor Yellow
    Write-Host "            expected: $binRel" -ForegroundColor DarkGray
    exit 0
}

if (-not (Test-Path $configPath)) {
    $example = Join-Path $AppRoot 'scripts\zlm\config.ini.example'
    if (Test-Path $example) {
        New-Item -ItemType Directory -Force -Path (Split-Path $configPath -Parent) | Out-Null
        Copy-Item $example $configPath -Force
        Write-Host "  ZLM: created config from template -> $configRel" -ForegroundColor DarkGray
    }
}

$pidFile = Join-Path $AppRoot 'storage\zlm-sidecar.pid'
New-Item -ItemType Directory -Force -Path (Join-Path $AppRoot 'storage') | Out-Null

$wd = Split-Path $binPath -Parent
$args = @('-c', $configPath)
$p = Start-Process -FilePath $binPath -ArgumentList $args -WorkingDirectory $wd -WindowStyle Hidden -PassThru
$p.Id | Set-Content $pidFile -Encoding ASCII
Write-Host "  ZLM sidecar started (PID $($p.Id))" -ForegroundColor Green

Start-Sleep -Seconds 2
if (Test-ZlmHttp -Url $httpUrl -Secret $secret) {
    Write-Host '  ZLM health OK' -ForegroundColor Green
} else {
    Write-Host '  ZLM started but health not ready yet — Fleet will probe' -ForegroundColor Yellow
}
