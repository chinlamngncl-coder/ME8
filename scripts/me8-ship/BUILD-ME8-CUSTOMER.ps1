# ME8 customer pack builder — Ubitron ship desk only (not customer-facing).
# Stages skeleton, factory storage, complete .env, license, and generated secrets.
param(
    [Parameter(Mandatory = $true)][string]$OutRoot,
    [string]$AppRoot = '',
    [string]$ManifestPath = '',
    [string]$CustomerName = '',
    [string]$LanIp = '',
    [string]$LicensePath = '',
    [switch]$VideoConference,
    [switch]$SkipPack,
    [switch]$SkipZip,
    [switch]$SkipVerify
)
$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host $msg -ForegroundColor Cyan }

function Get-Me8AppRoot {
    param([string]$Start)
    if ($Start -and (Test-Path (Join-Path $Start 'server.js'))) { return (Resolve-Path $Start).Path }
    $here = $PSScriptRoot
    $parent = Split-Path $here -Parent
    $grand = Split-Path $parent -Parent
    if (Test-Path (Join-Path $grand 'server.js')) { return $grand }
    throw 'ME8 AppRoot not found — pass -AppRoot or run from ME8 tree'
}

function New-Me8Secret {
    param([int]$Length = 20)
    $chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    $bytes = New-Object byte[] $Length
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $out = New-Object char[] $Length
    for ($i = 0; $i -lt $Length; $i++) {
        $out[$i] = $chars[$bytes[$i] % $chars.Length]
    }
    return -join $out
}

function Set-EnvKey {
    param([string]$Path, [string]$Key, [string]$Value)
    $raw = Get-Content $Path -Raw -Encoding UTF8
    $line = "$Key=$Value"
    if ($raw -match "(?m)^\s*$([regex]::Escape($Key))\s*=") {
        $raw = $raw -replace "(?m)^\s*$([regex]::Escape($Key))\s*=.*$", $line
    } else {
        if ($raw -and -not $raw.EndsWith("`n")) { $raw += "`r`n" }
        $raw += "$line`r`n"
    }
    Set-Content $Path $raw -Encoding UTF8 -NoNewline
}

function Test-LicenseFile {
    param([string]$Path)
    if (-not (Test-Path $Path)) { throw "License file not found: $Path" }
    try {
        $lic = Get-Content $Path -Raw -Encoding UTF8 | ConvertFrom-Json
    } catch {
        throw "License file is not valid JSON: $Path"
    }
    if (-not $lic.licenseId) { throw 'License missing licenseId' }
    if (-not $lic.signature) { throw 'License missing signature' }
    return $lic
}

function Update-TenantProfile {
    param([string]$Path, [string]$CustomerName, [object]$License)
    if (-not (Test-Path $Path)) { return }
    $tp = Get-Content $Path -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($CustomerName) { $tp.displayName = $CustomerName }
    if ($License) {
        $tp.licenseId = $License.licenseId
        $tp.limitsSource = 'license'
        if ($License.maxBwcDevices) { $tp.limits.maxBwcDevices = [int]$License.maxBwcDevices }
        if ($License.maxDashboardUsers) { $tp.limits.maxDashboardUsers = [int]$License.maxDashboardUsers }
    }
    $tp.updatedAt = (Get-Date).ToUniversalTime().ToString('o')
    ($tp | ConvertTo-Json -Depth 8) | Set-Content $Path -Encoding UTF8
}

function Update-ServerSettingsTenant {
    param([string]$Path, [string]$CustomerName)
    if (-not (Test-Path $Path) -or -not $CustomerName) { return }
    $ss = Get-Content $Path -Raw -Encoding UTF8 | ConvertFrom-Json
    if (-not $ss.deployment) { $ss | Add-Member -NotePropertyName deployment -NotePropertyValue (@{}) }
    $ss.deployment.tenantName = $CustomerName
    ($ss | ConvertTo-Json -Depth 12) | Set-Content $Path -Encoding UTF8
}

function Enable-EnvVideoConference {
    param([string]$EnvPath, [string]$Ip)
    Set-EnvKey -Path $EnvPath -Key 'FM_LIVEKIT_URL' -Value 'http://127.0.0.1:7880'
    Set-EnvKey -Path $EnvPath -Key 'FM_LIVEKIT_PUBLIC_WS' -Value "ws://${Ip}:7880"
    Set-EnvKey -Path $EnvPath -Key 'FM_LIVEKIT_API_KEY' -Value 'devkey'
    Set-EnvKey -Path $EnvPath -Key 'FM_LIVEKIT_API_SECRET' -Value 'secret'
}

if (-not $AppRoot) { $AppRoot = Get-Me8AppRoot -Start '' }
else {
    $AppRoot = (Resolve-Path $AppRoot).Path
    if (-not (Test-Path (Join-Path $AppRoot 'server.js'))) { throw "Not ME8 root: $AppRoot" }
}

if ($ManifestPath) {
    $mp = (Resolve-Path $ManifestPath).Path
    $manifest = Get-Content $mp -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($manifest.customerName -and -not $CustomerName) { $CustomerName = [string]$manifest.customerName }
    if ($manifest.lanIp -and -not $LanIp) { $LanIp = [string]$manifest.lanIp }
    if ($manifest.licensePath -and -not $LicensePath) { $LicensePath = [string]$manifest.licensePath }
    if ($manifest.PSObject.Properties.Name -contains 'videoConference' -and -not $PSBoundParameters.ContainsKey('VideoConference')) {
        $VideoConference = [bool]$manifest.videoConference
    }
}

if (-not $CustomerName) { throw 'CustomerName required (-CustomerName or manifest.customerName)' }
if (-not $LanIp) { throw 'LanIp required (-LanIp or manifest.lanIp)' }
if (-not $LicensePath) { throw 'LicensePath required (-LicensePath or manifest.licensePath)' }

$OutRoot = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutRoot)
$license = Test-LicenseFile -Path $LicensePath
$sku = if ($VideoConference) { 'ME8-VC' } else { 'ME8-Core' }

Write-Step "BUILD ME8 customer pack -> $OutRoot"
Write-Host "  Customer: $CustomerName" -ForegroundColor Gray
Write-Host "  LAN IP:   $LanIp" -ForegroundColor Gray
Write-Host "  SKU:      $sku" -ForegroundColor Gray
Write-Host "  License:  $($license.licenseId)" -ForegroundColor Gray

$packScript = Join-Path $AppRoot 'scripts\me8-ship\PACK-ME8-SKELETON.ps1'
if (-not $SkipPack) {
    if (-not (Test-Path $packScript)) { throw 'PACK-ME8-SKELETON.ps1 missing' }
    Write-Step 'Stage skeleton (no lab storage)...'
    & $packScript -AppRoot $AppRoot -OutRoot $OutRoot -SkipZip
}

if (-not (Test-Path (Join-Path $OutRoot 'server.js'))) {
    throw "OutRoot is not a staged ME8 pack: $OutRoot"
}

$installScript = Join-Path $AppRoot 'scripts\me8-ship\NEW-ME8-INSTALL.ps1'
Write-Step 'Factory storage + base .env...'
& $installScript -AppRoot $OutRoot -LanIp $LanIp -ForceEnv -SkipBackup

$ftpUser = 'ub' + (New-Me8Secret -Length 8).ToLower()
$ftpPass = New-Me8Secret -Length 24
$sipPass = New-Me8Secret -Length 16
$sipPassAlt = New-Me8Secret -Length 16

$envPath = Join-Path $OutRoot '.env'
Write-Step 'Write customer .env (secrets generated - customer must not edit)...'
Set-EnvKey -Path $envPath -Key 'FM_FTP_ENABLED' -Value '1'
Set-EnvKey -Path $envPath -Key 'FM_FTP_USER' -Value $ftpUser
Set-EnvKey -Path $envPath -Key 'FM_FTP_PASS' -Value $ftpPass
Set-EnvKey -Path $envPath -Key 'FM_GB28181_PASSWORD' -Value $sipPass
Set-EnvKey -Path $envPath -Key 'FM_GB28181_PASSWORD_ALT' -Value $sipPassAlt
Set-EnvKey -Path $envPath -Key 'FM_SEED_BWC_ID' -Value ''
Set-EnvKey -Path $envPath -Key 'FM_SEED_BWC_NICKNAME' -Value ''
if ($VideoConference) {
    Enable-EnvVideoConference -EnvPath $envPath -Ip $LanIp
}

$storage = Join-Path $OutRoot 'storage'
Write-Step 'Install platform license...'
Copy-Item $LicensePath (Join-Path $storage 'platform-license.json') -Force

$tenantPath = Join-Path $storage 'tenant-profile.json'
Update-TenantProfile -Path $tenantPath -CustomerName $CustomerName -License $license
Update-ServerSettingsTenant -Path (Join-Path $storage 'server-settings.json') -CustomerName $CustomerName

$shipMeta = [ordered]@{
    schemaVersion = 1
    builtAt       = (Get-Date).ToUniversalTime().ToString('o')
    customerName  = $CustomerName
    lanIp         = $LanIp
    sku           = $sku
    videoConference = [bool]$VideoConference
    licenseId     = [string]$license.licenseId
    builder       = 'BUILD-ME8-CUSTOMER.ps1'
}
$metaPath = Join-Path $storage 'customer-ship-record.json'
($shipMeta | ConvertTo-Json -Depth 4) | Set-Content $metaPath -Encoding UTF8

$aclScript = Join-Path $AppRoot 'scripts\me8-ship\LOCK-SECRETS-ACL.ps1'
if (Test-Path $aclScript) {
    Write-Step 'Lock storage/secrets ACL...'
    & $aclScript -AppRoot $OutRoot
}

if (-not $SkipVerify) {
    $verifyScript = Join-Path $AppRoot 'scripts\me8-ship\VERIFY-ME8-FRESH.ps1'
    Write-Step 'VERIFY staged customer pack...'
    & $verifyScript -AppRoot $OutRoot -Quiet
    if ($LASTEXITCODE -ne 0) { throw 'VERIFY-ME8-FRESH failed — fix before handoff' }
}

if (-not $SkipZip) {
    $stamp = Get-Date -Format 'yyyyMMdd-HHmm'
    $safeName = ($CustomerName -replace '[^\w\-]', '-').Trim('-')
    if (-not $safeName) { $safeName = 'customer' }
    $zipPath = Join-Path (Split-Path $OutRoot -Parent) ("ME8-$safeName-$stamp.zip")
    Write-Step "Zip -> $zipPath"
    Compress-Archive -Path (Join-Path $OutRoot '*') -DestinationPath $zipPath -CompressionLevel Optimal
}

Write-Host ''
Write-Host 'ME8 CUSTOMER PACK OK' -ForegroundColor Green
Write-Host "  Folder:   $OutRoot"
Write-Host "  Customer: $CustomerName"
Write-Host "  URL:      http://${LanIp}:3988"
Write-Host "  SKU:      $sku"
if (-not $SkipZip) { Write-Host "  Zip:      $zipPath" }
Write-Host ''
Write-Host 'Internal: FTP/SIP secrets are in .env on the pack - first Fleet start moves SIP/FTP passwords into storage/secrets/ vault.' -ForegroundColor DarkGray
Write-Host 'Customer handoff: npm install (once), RESTART-FLEET.bat - do not ask customer to edit .env (Wave 2 SETUP-ME8.bat).' -ForegroundColor DarkGray
Write-Host ''
