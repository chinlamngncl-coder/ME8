# ME8 dashboard TLS — lab self-signed cert, trust proxy, optional operator URL.
param(
    [string]$AppRoot = '',
    [string]$HostName = '',
    [int]$TlsPort = 3443,
    [switch]$SetOperatorUrl,
    [switch]$SkipTrustProxy
)
$ErrorActionPreference = 'Stop'

function Write-Ok($msg) { Write-Host "[ok] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[warn] $msg" -ForegroundColor Yellow }
function Write-Step($msg) { Write-Host $msg -ForegroundColor Cyan }

function Get-Me8AppRoot {
    param([string]$Start)
    if ($Start -and (Test-Path (Join-Path $Start 'server.js'))) { return (Resolve-Path $Start).Path }
    $here = $PSScriptRoot
    $grand = Split-Path (Split-Path $here -Parent) -Parent
    if (Test-Path (Join-Path $grand 'server.js')) { return $grand }
    throw 'ME8 AppRoot not found — pass -AppRoot'
}

function Get-PrimaryLanIp {
    try {
        $ip = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object {
                $_.IPAddress -notlike '127.*' -and
                $_.IPAddress -notlike '169.254.*' -and
                $_.PrefixOrigin -ne 'WellKnown'
            } |
            Sort-Object InterfaceMetric, PrefixLength |
            Select-Object -First 1 -ExpandProperty IPAddress)
        if ($ip) { return $ip }
    } catch { }
    return '127.0.0.1'
}

function Enable-TrustProxy {
    param([string]$StorageDir)
    $labPath = Join-Path $StorageDir 'lab-security.json'
    $lab = @{
        oidcEnabled = $false
        oidcIssuer = ''
        oidcClientId = 'mobility-dashboard'
        oidcClientSecret = ''
        oidcScopes = 'openid profile email groups'
        oidcAdminGroups = 'mobility-admins,bwcms-admins'
        oidcOperatorGroups = 'mobility-operators,bwcms-operators'
        oidcAutoProvision = $true
        localLoginEnabled = $true
        trustProxy = $true
        metricsEnabled = $true
        metricsToken = ''
        auditExportToken = ''
        notes = 'mob-me8-tls-dashboard - trust reverse proxy for HTTPS operator URL'
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
    }
    $lab | ConvertTo-Json -Depth 6 | Set-Content $labPath -Encoding UTF8
}

function Set-OperatorHttpsUrl {
    param([string]$StorageDir, [string]$HttpsUrl)
    $settingsPath = Join-Path $StorageDir 'server-settings.json'
    if (-not (Test-Path $settingsPath)) {
        Write-Host "[warn] server-settings.json missing - set operator URL in Settings after first start" -ForegroundColor Yellow
        return
    }
    $raw = Get-Content $settingsPath -Raw -Encoding UTF8
    $settings = $raw | ConvertFrom-Json
    if (-not $settings.deployment) {
        $settings | Add-Member -NotePropertyName deployment -NotePropertyValue (@{}) -Force
    }
    $settings.deployment.operatorUrl = $HttpsUrl
    $settings | ConvertTo-Json -Depth 20 | Set-Content $settingsPath -Encoding UTF8
    Write-Ok "operatorUrl -> $HttpsUrl"
}

if (-not $AppRoot) { $AppRoot = Get-Me8AppRoot -Start '' }
else { $AppRoot = (Resolve-Path $AppRoot).Path }

$storage = Join-Path $AppRoot 'storage'
$tlsDir = Join-Path $storage 'tls'
$certPath = Join-Path $tlsDir 'me8-dashboard.crt'
$keyPath = Join-Path $tlsDir 'me8-dashboard.key'

if (-not $HostName) {
    $HostName = Get-PrimaryLanIp
}

Write-Step "ME8 TLS dashboard setup -> $AppRoot (host $HostName :$TlsPort)"

New-Item -ItemType Directory -Force -Path $tlsDir | Out-Null

$dnsNames = @($HostName, 'localhost', '127.0.0.1') | Select-Object -Unique
$cert = New-SelfSignedCertificate `
    -Subject "CN=ME8-Dashboard" `
    -FriendlyName "ME8 dashboard TLS (lab)" `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -HashAlgorithm SHA256 `
    -NotAfter (Get-Date).AddYears(3) `
    -CertStoreLocation 'Cert:\CurrentUser\My' `
    -TextExtension @(
        "2.5.29.37={text}1.3.6.1.5.5.7.3.1",
        "2.5.29.17={text}DNS=$($dnsNames -join '&DNS=')"
    )

$pwdPlain = [guid]::NewGuid().ToString('N')
$pwd = ConvertTo-SecureString -String $pwdPlain -AsPlainText -Force
$pfxPath = Join-Path $tlsDir 'me8-dashboard.pfx'
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $pwd | Out-Null
Set-Content (Join-Path $tlsDir 'pfx-pass.txt') $pwdPlain -Encoding ASCII -NoNewline

# PEM for Node me8-tls-proxy.js
$base64 = [Convert]::ToBase64String($cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert))
$pemCert = "-----BEGIN CERTIFICATE-----`n"
for ($i = 0; $i -lt $base64.Length; $i += 64) {
    $pemCert += $base64.Substring($i, [Math]::Min(64, $base64.Length - $i)) + "`n"
}
$pemCert += "-----END CERTIFICATE-----"
Set-Content $certPath $pemCert -Encoding ASCII -NoNewline

try {
    $rsa = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
    if (-not $rsa) { throw 'no RSA private key' }
    $keyBytes = $rsa.ExportPkcs8PrivateKey()
    $keyBase64 = [Convert]::ToBase64String($keyBytes)
    $pemKey = "-----BEGIN PRIVATE KEY-----`n"
    for ($i = 0; $i -lt $keyBase64.Length; $i += 64) {
        $pemKey += $keyBase64.Substring($i, [Math]::Min(64, $keyBase64.Length - $i)) + "`n"
    }
    $pemKey += "-----END PRIVATE KEY-----"
    Set-Content $keyPath $pemKey -Encoding ASCII -NoNewline
} catch {
    Write-Warn "PEM key export failed - me8-tls-proxy.js can use PFX: $pfxPath"
}

Write-Ok "self-signed cert -> $tlsDir"

if (-not $SkipTrustProxy) {
    Enable-TrustProxy -StorageDir $storage
    Write-Ok 'lab-security.json trustProxy=true (restart Fleet to apply)'
}

$httpsUrl = "https://${HostName}:$TlsPort"
if ($SetOperatorUrl) {
    Set-OperatorHttpsUrl -StorageDir $storage -HttpsUrl $httpsUrl
}

Write-Host ''
Write-Host 'Next steps:' -ForegroundColor Yellow
Write-Host "  1. .\RESTART-FLEET.bat   # apply trust proxy"
Write-Host "  2. Start TLS proxy (new window):"
Write-Host "       `$env:FM_TLS_LISTEN_PORT=$TlsPort; node scripts\me8-ship\me8-tls-proxy.js"
Write-Host "  3. Open $httpsUrl  (accept browser cert warning on lab)"
Write-Host "  4. .\VERIFY-TLS-DASHBOARD.ps1 -BaseUrl $httpsUrl"
Write-Host ''
Write-Host 'Production: use scripts\me8-ship\templates\ (nginx / Caddy) on port 443 - see docs\ME8-TLS-DASHBOARD.md'
