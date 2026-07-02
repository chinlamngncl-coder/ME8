# Start LiveKit MCU (Video Conference)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dockerDir = Join-Path $root 'docker'
$yamlPath = Join-Path $dockerDir 'livekit.yaml'
$hostIp = '127.0.0.1'
$envFile = Join-Path $root '.env'
if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile) {
        if ($line -match '^\s*HOST=(.+)$') {
            $hostIp = $Matches[1].Trim().Trim('"').Trim("'")
            break
        }
    }
}
if (Test-Path $yamlPath) {
    $yaml = Get-Content $yamlPath -Raw
    if ($yaml -match '(?m)^\s*node_ip:\s*.+$') {
        $yaml = $yaml -replace '(?m)^(\s*node_ip:\s*).+$', "`${1}$hostIp"
    } else {
        $yaml = $yaml -replace '(?m)^(\s*use_external_ip:\s*.+)$', "  node_ip: $hostIp`r`n`${1}"
    }
    if ($yaml -match '(?m)^\s*rtmp_base_url:\s*.+$') {
        $yaml = $yaml -replace '(?m)^(\s*rtmp_base_url:\s*).+$', "`${1}rtmp://${hostIp}:1935/x"
    } elseif ($yaml -notmatch '(?m)^ingress:') {
        $yaml = $yaml.TrimEnd() + "`r`ningress:`r`n  rtmp_base_url: rtmp://${hostIp}:1935/x`r`n"
    }
    Set-Content -Path $yamlPath -Value $yaml -NoNewline
}
Set-Location $dockerDir
docker compose -f livekit.compose.yaml up -d --force-recreate
Write-Host ''
Write-Host "LiveKit MCU + egress + ingress started (ICE node_ip=$hostIp)"
Write-Host '  Signaling: http://127.0.0.1:7880'
Write-Host "  Client WS: ws://${hostIp}:7880"
Write-Host "  BWC RTMP:  rtmp://${hostIp}:1935/x"
Write-Host '  Recordings: storage/conference-recordings (via egress container)'
Write-Host ''
Write-Host 'Mobility .env should include:'
Write-Host '  FM_LIVEKIT_URL=http://127.0.0.1:7880'
Write-Host "  FM_LIVEKIT_PUBLIC_WS=ws://${hostIp}:7880"
Write-Host '  FM_LIVEKIT_API_KEY=devkey'
Write-Host '  FM_LIVEKIT_API_SECRET=secret'
Write-Host 'Then restart Mobility (RESTART-FLEET.bat)'
