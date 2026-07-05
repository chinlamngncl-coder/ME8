# ME8 customer pack builder — Ubitron ship desk only (not customer-facing).
# Stages skeleton, factory storage, bootstrap profile, license, npm deps, and generated secrets. Ubitron ship desk only.
param(
    [Parameter(Mandatory = $true)][string]$OutRoot,
    [string]$AppRoot = '',
    [string]$ManifestPath = '',
    [string]$CustomerName = '',
    [string]$LanIp = '',
    [string]$LicensePath = '',
    [string]$OperatorHttpsUrl = '',
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
    param([string]$Path, [string]$CustomerName, [string]$OperatorUrl)
    if (-not (Test-Path $Path)) { return }
    $ss = Get-Content $Path -Raw -Encoding UTF8 | ConvertFrom-Json
    if (-not $ss.deployment) { $ss | Add-Member -NotePropertyName deployment -NotePropertyValue (@{}) }
    if ($CustomerName) { $ss.deployment.tenantName = $CustomerName }
    if ($OperatorUrl) { $ss.deployment.operatorUrl = $OperatorUrl }
    ($ss | ConvertTo-Json -Depth 12) | Set-Content $Path -Encoding UTF8
}

function Write-HandoffSheet {
    param(
        [string]$Path,
        [string]$CustomerName,
        [string]$LanIp,
        [string]$OperatorUrl,
        [string]$Sku
    )
    $lines = @(
        'Ubitron ME8 — site handoff sheet',
        '================================',
        '',
        "Customer:   $CustomerName",
        "Built:      $((Get-Date).ToUniversalTime().ToString('yyyy-MM-dd HH:mm')) UTC",
        "SKU:        $Sku",
        '',
        'Operator dashboard URL (give this to dispatch staff):',
        "  $OperatorUrl",
        '',
        'First login (site super admin — change immediately):',
        '  Username: global',
        '  Password: global123',
        '',
        'Operator guide: CUSTOMER-START.txt',
        'Site admin guide: docs\ME8-CUSTOMER-INSTALL.md',
        '',
        'HTTPS (optional — customer IT only):',
        '  docs\ME8-TLS-IT-APPENDIX.md',
        '  After IT terminates TLS, set the same https:// URL above in Settings → Operator login URL.'
    )
    Set-Content $Path ($lines -join "`r`n") -Encoding UTF8
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
    if ($manifest.operatorHttpsUrl -and -not $OperatorHttpsUrl) { $OperatorHttpsUrl = [string]$manifest.operatorHttpsUrl }
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
$operatorUrl = if ($OperatorHttpsUrl) {
    if ($OperatorHttpsUrl -notmatch '^https://') { throw 'OperatorHttpsUrl must start with https://' }
    $OperatorHttpsUrl.TrimEnd('/')
} else {
    "http://${LanIp}:3988"
}
$tlsMode = if ($OperatorHttpsUrl) { 'https-operator-url' } else { 'http-lan-default' }

Write-Step "BUILD ME8 customer pack -> $OutRoot"
Write-Host "  Customer: $CustomerName" -ForegroundColor Gray
Write-Host "  LAN IP:   $LanIp" -ForegroundColor Gray
Write-Host "  SKU:      $sku" -ForegroundColor Gray
Write-Host "  License:  $($license.licenseId)" -ForegroundColor Gray
Write-Host "  URL:      $operatorUrl" -ForegroundColor Gray
Write-Host "  TLS:      $tlsMode" -ForegroundColor Gray

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
Write-Step 'Factory storage + bootstrap profile...'
& $installScript -AppRoot $OutRoot -LanIp $LanIp -ForceEnv -SkipBackup

$ftpUser = 'ub' + (New-Me8Secret -Length 8).ToLower()
$ftpPass = New-Me8Secret -Length 24
$sipPass = New-Me8Secret -Length 16
$sipPassAlt = New-Me8Secret -Length 16

$envPath = Join-Path $OutRoot '.env'
Write-Step 'Write bootstrap secrets (generated at ship desk — operators use Settings only)...'
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
Update-ServerSettingsTenant -Path (Join-Path $storage 'server-settings.json') -CustomerName $CustomerName -OperatorUrl $operatorUrl

if ($OperatorHttpsUrl) {
    Write-Step 'Enable trust reverse proxy for HTTPS operator URL...'
    $labPath = Join-Path $storage 'lab-security.json'
    $lab = @{
        trustProxy = $true
        notes = 'Operator login URL uses HTTPS — trust reverse proxy enabled automatically'
    }
    if (Test-Path $labPath) {
        try {
            $existing = Get-Content $labPath -Raw -Encoding UTF8 | ConvertFrom-Json
            foreach ($p in $existing.PSObject.Properties) {
                if ($p.Name -ne 'trustProxy' -and $p.Name -ne 'notes') {
                    $lab[$p.Name] = $p.Value
                }
            }
        } catch { }
    } else {
        $lab.oidcEnabled = $false
        $lab.localLoginEnabled = $true
        $lab.metricsEnabled = $true
    }
    $lab | ConvertTo-Json -Depth 6 | Set-Content $labPath -Encoding UTF8
}

$shipMeta = [ordered]@{
    schemaVersion = 1
    builtAt       = (Get-Date).ToUniversalTime().ToString('o')
    customerName  = $CustomerName
    lanIp         = $LanIp
    operatorUrl   = $operatorUrl
    tlsMode       = $tlsMode
    sku           = $sku
    videoConference = [bool]$VideoConference
    licenseId     = [string]$license.licenseId
    builder       = 'BUILD-ME8-CUSTOMER.ps1'
}
$metaPath = Join-Path $storage 'customer-ship-record.json'
($shipMeta | ConvertTo-Json -Depth 4) | Set-Content $metaPath -Encoding UTF8

Write-HandoffSheet -Path (Join-Path $OutRoot 'HANDOFF-SHEET.txt') `
    -CustomerName $CustomerName -LanIp $LanIp -OperatorUrl $operatorUrl -Sku $sku

$aclScript = Join-Path $AppRoot 'scripts\me8-ship\LOCK-SECRETS-ACL.ps1'
if (Test-Path $aclScript) {
    Write-Step 'Lock storage/secrets ACL...'
    & $aclScript -AppRoot $OutRoot
}

Write-Step 'Install Node dependencies (ship desk — bundled in customer pack)...'
Push-Location $OutRoot
npm install --omit=dev 2>&1 | ForEach-Object { Write-Host $_ }
if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'npm install failed — fix before handoff' }
Pop-Location

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
Write-Host "  URL:      $operatorUrl"
Write-Host "  SKU:      $sku"
if (-not $SkipZip) { Write-Host "  Zip:      $zipPath" }
Write-Host ''
Write-Host 'Partner handoff: HANDOFF-SHEET.txt + SETUP-ME8.bat + CUSTOMER-START.txt (see docs/ME8-INSTALLER-RUNBOOK.md).' -ForegroundColor DarkGray
Write-Host 'Internal: docs/ME8-INTERNAL-SHIP-DESK.md — VERIFY before zip leaves Ubitron.' -ForegroundColor DarkGray
Write-Host ''
