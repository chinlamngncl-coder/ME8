# Start LiveKit MCU (Video Conference)
# LAB-DEFAULT-CREDS-AND-IMAGE-PIN-V1 — builds livekit.runtime.yaml from template + .env keys.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dockerDir = Join-Path $root 'docker'
$templatePath = Join-Path $dockerDir 'livekit.yaml'
$runtimePath = Join-Path $dockerDir 'livekit.runtime.yaml'
$envFile = Join-Path $root '.env'

function Read-DotEnvValue([string]$Key) {
    if (-not (Test-Path $envFile)) { return $null }
    $line = Get-Content $envFile | Where-Object { $_ -match "^\s*$Key\s*=" } | Select-Object -First 1
    if (-not $line) { return $null }
    return ($line -replace "^\s*$Key\s*=\s*", '').Trim().Trim('"').Trim("'")
}

$hostIp = Read-DotEnvValue 'HOST'
if (-not $hostIp) { $hostIp = '127.0.0.1' }

# Lab fallback keeps bench working; ship/customer must set strong FM_LIVEKIT_* in .env
$lkKey = Read-DotEnvValue 'FM_LIVEKIT_API_KEY'
if (-not $lkKey) { $lkKey = 'devkey' }
$lkSecret = Read-DotEnvValue 'FM_LIVEKIT_API_SECRET'
if (-not $lkSecret) { $lkSecret = 'secret' }

if (-not (Test-Path $templatePath)) {
    throw "Missing LiveKit template: $templatePath"
}

$yaml = Get-Content $templatePath -Raw
if ($yaml -match '(?m)^\s*node_ip:\s*.+$') {
    $yaml = $yaml -replace '(?m)^(\s*node_ip:\s*).+$', "`${1}$hostIp"
}
if ($yaml -match '(?m)^\s*rtmp_base_url:\s*.+$') {
    $yaml = $yaml -replace '(?m)^(\s*rtmp_base_url:\s*).+$', "`${1}rtmp://${hostIp}:1935/x"
} elseif ($yaml -notmatch '(?m)^ingress:') {
    $yaml = $yaml.TrimEnd() + "`r`ningress:`r`n  rtmp_base_url: rtmp://${hostIp}:1935/x`r`n"
}
# Replace keys block (placeholder or previous)
if ($yaml -match '(?ms)^keys:\r?\n(?:[ \t].*\r?\n)*') {
    $yaml = $yaml -replace '(?ms)^keys:\r?\n(?:[ \t].*\r?\n)*', "keys:`r`n  ${lkKey}: ${lkSecret}`r`n"
} else {
    $yaml = $yaml.TrimEnd() + "`r`nkeys:`r`n  ${lkKey}: ${lkSecret}`r`n"
}

Set-Content -Path $runtimePath -Value $yaml -NoNewline

$env:FM_LIVEKIT_API_KEY = $lkKey
$env:FM_LIVEKIT_API_SECRET = $lkSecret

Set-Location $dockerDir
docker compose -f livekit.compose.yaml up -d --force-recreate
Write-Host ''
Write-Host "LiveKit MCU + egress + ingress started (ICE node_ip=$hostIp)"
Write-Host '  Signaling: http://127.0.0.1:7880'
Write-Host "  Client WS: ws://${hostIp}:7880"
Write-Host "  BWC RTMP:  rtmp://${hostIp}:1935/x"
Write-Host '  Recordings: storage/conference-recordings (via egress container)'
Write-Host '  Config: docker/livekit.runtime.yaml (gitignored; from template + .env)'
Write-Host ''
Write-Host 'Mobility .env should include:'
Write-Host '  FM_LIVEKIT_URL=http://127.0.0.1:7880'
Write-Host "  FM_LIVEKIT_PUBLIC_WS=ws://${hostIp}:7880"
Write-Host "  FM_LIVEKIT_API_KEY=$lkKey"
Write-Host '  FM_LIVEKIT_API_SECRET=(set in .env — not printed)'
Write-Host 'Then restart Mobility (RESTART-FLEET.bat)'
Write-Host ''
Write-Host 'Ship/customer: set strong FM_LIVEKIT_API_KEY / FM_LIVEKIT_API_SECRET before expose.'
