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

if (-not $SiteHost -and (Test-Path $envFile)) {
    foreach ($line in Get-Content $envFile) {
        if ($line -match '^\s*HOST=(.+)$') {
            $SiteHost = $Matches[1].Trim().Trim('"').Trim("'")
            break
        }
    }
}
if (-not $SiteHost) { $SiteHost = '192.168.1.38' }

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
