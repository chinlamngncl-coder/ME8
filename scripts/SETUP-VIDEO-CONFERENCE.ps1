# Configure Video Conference for this site (LAN / remote / cloud).
param(
    [string]$SiteHost = '',
    [ValidateSet('lan-docker', 'remote-mcu', 'livekit-cloud')]
    [string]$DeployMode = 'lan-docker',
    [string]$ApiUrl = '',
    [string]$PublicWs = '',
    [string]$ApiKey = 'devkey',
    [string]$ApiSecret = 'secret',
    [string]$TurnUrl = '',
    [switch]$StartLiveKit
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env'
$storageDir = Join-Path $root 'storage'

if (-not $SiteHost) {
    $detectPs1 = Join-Path $root 'scripts\Get-UbitronPreferredLanIPv4.ps1'
    if (Test-Path $detectPs1) {
        $SiteHost = (& $detectPs1 -Print | Select-Object -Last 1)
        if ($SiteHost) { $SiteHost = [string]$SiteHost.Trim() }
    }
}
if (-not $SiteHost -or $SiteHost -eq '192.168.1.38' -or $SiteHost -eq 'YOUR_LAN_IP' -or $SiteHost -match '^(127\.|169\.254\.|172\.(1[7-9]|2[0-9]|3[0-1])\.)') {
    throw 'No current Wi-Fi/Ethernet IPv4. Do not use a desk IP.'
}

if (-not $ApiUrl) {
    if ($DeployMode -eq 'lan-docker') { $ApiUrl = 'http://127.0.0.1:7880' }
    else { $ApiUrl = "http://${SiteHost}:7880" }
}
if (-not $PublicWs) {
    $PublicWs = "ws://${SiteHost}:7880"
}

Write-Host ''
Write-Host 'Mobility Video Conference setup'
Write-Host "  Site host:     $SiteHost"
Write-Host "  Deploy mode:   $DeployMode"
Write-Host "  MCU API URL:   $ApiUrl"
Write-Host "  Client WS URL: $PublicWs"
Write-Host "  ICE node IP:   $SiteHost"
Write-Host ''

$configJson = @{
    deployMode   = $DeployMode
    siteHost     = $SiteHost
    apiUrl       = $ApiUrl
    publicWsUrl  = $PublicWs
    apiKey       = $ApiKey
    apiSecret    = $ApiSecret
    iceNodeIp    = $SiteHost
    turnUrl      = $TurnUrl
    edgeUrl      = ''
    proxyNote    = ''
    publicHttpPort = '7880'
    updatedAt    = (Get-Date).ToUniversalTime().ToString('o')
} | ConvertTo-Json -Depth 4

if (-not (Test-Path $storageDir)) { New-Item -ItemType Directory -Path $storageDir | Out-Null }
$configPath = Join-Path $storageDir 'conference-settings.json'
Set-Content -Path $configPath -Value $configJson -Encoding UTF8
Write-Host "Wrote $configPath"

node (Join-Path $PSScriptRoot 'apply-conference-config.js')

if ($StartLiveKit) {
    & (Join-Path $root 'scripts\START-LIVEKIT.ps1')
}

Write-Host ''
Write-Host 'Next steps:'
Write-Host '  1. Open firewall: TCP 7880, 7881 and UDP 50000-50100 on this server'
Write-Host '  2. .\RESTART-FLEET.bat'
Write-Host '  3. Dashboard -> Video Conference -> Settings -> Test connection -> Save'
Write-Host '  4. Full guide: docs\VC-DEPLOY-KIT.md'
Write-Host ''
