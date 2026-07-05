# Verify ME8 dashboard TLS - HTTPS health, Secure session cookie, trust proxy.
param(
    [string]$AppRoot = '',
    [string]$BaseUrl = 'https://127.0.0.1:3443',
    [switch]$SkipTrustProxyCheck
)
$ErrorActionPreference = 'Stop'

function Enable-TlsCertBypass {
    if (Get-Command Invoke-WebRequest | Select-Object -ExpandProperty Parameters | Where-Object { $_.Name -eq 'SkipCertificateCheck' }) {
        return
    }
    add-type @"
using System.Net;
using System.Security.Cryptography.X509Certificates;
public class Me8TlsVerifyCertPolicy {
    public static bool Ignore(object sender, X509Certificate cert, X509Chain chain, System.Net.Security.SslPolicyErrors errors) { return true; }
}
"@
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
    [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { param($sender,$cert,$chain,$errors) return $true }
}

function Invoke-Me8Https {
    param([string]$Uri)
    $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
    if ($curl) {
        $tmpBody = [System.IO.Path]::GetTempFileName()
        $tmpHead = [System.IO.Path]::GetTempFileName()
        try {
            $code = & curl.exe -k -s -o $tmpBody -D $tmpHead -w '%{http_code}' $Uri
            $headersRaw = Get-Content $tmpHead -Raw -Encoding UTF8
            $headers = @{}
            foreach ($line in ($headersRaw -split "`n")) {
                if ($line -match '^\s*$') { break }
                if ($line -match '^([^:]+):\s*(.*)$') {
                    $headers[$Matches[1].Trim()] = $Matches[2].Trim()
                }
            }
            return [pscustomobject]@{
                StatusCode = [int]$code
                Content = (Get-Content $tmpBody -Raw -Encoding UTF8)
                Headers = $headers
            }
        } finally {
            Remove-Item $tmpBody, $tmpHead -Force -ErrorAction SilentlyContinue
        }
    }
    Enable-TlsCertBypass
    $params = @{
        Uri = $Uri
        TimeoutSec = 15
        UseBasicParsing = $true
    }
    if (Get-Command Invoke-WebRequest | Select-Object -ExpandProperty Parameters | Where-Object { $_.Name -eq 'SkipCertificateCheck' }) {
        $params['SkipCertificateCheck'] = $true
    }
    return Invoke-WebRequest @params
}

function Write-Ok($msg) { Write-Host "[ok] $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "[fail] $msg" -ForegroundColor Red }
function Write-Warn($msg) { Write-Host "[warn] $msg" -ForegroundColor Yellow }

function Get-Me8AppRoot {
    param([string]$Start)
    if ($Start -and (Test-Path (Join-Path $Start 'server.js'))) { return (Resolve-Path $Start).Path }
    $here = $PSScriptRoot
    $grand = Split-Path (Split-Path $here -Parent) -Parent
    if (Test-Path (Join-Path $grand 'server.js')) { return $grand }
    throw 'ME8 AppRoot not found - pass -AppRoot'
}

$issues = @()

if (-not $AppRoot) { $AppRoot = Get-Me8AppRoot -Start '' }
else { $AppRoot = (Resolve-Path $AppRoot).Path }

$storage = Join-Path $AppRoot 'storage'
$tlsCert = Join-Path $storage 'tls\me8-dashboard.crt'
if (Test-Path $tlsCert) {
    Write-Ok 'TLS cert present in storage/tls/'
} else {
    Write-Warn 'No storage/tls/me8-dashboard.crt - run SETUP-TLS-DASHBOARD.ps1 first'
}

if (-not $SkipTrustProxyCheck) {
    $labPath = Join-Path $storage 'lab-security.json'
    if (Test-Path $labPath) {
        try {
            $lab = Get-Content $labPath -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($lab.trustProxy) {
                Write-Ok 'lab-security trustProxy enabled'
            } else {
                Write-Fail 'lab-security trustProxy is false - enable in LAB tab or re-run SETUP-TLS-DASHBOARD.ps1'
                $issues += 'trustProxy'
            }
        } catch {
            Write-Fail 'lab-security.json unreadable'
            $issues += 'lab-security'
        }
    } else {
        Write-Warn 'lab-security.json missing - trust proxy not configured'
        $issues += 'trustProxy-missing'
    }
}

$settingsPath = Join-Path $storage 'server-settings.json'
if (Test-Path $settingsPath) {
    try {
        $settings = Get-Content $settingsPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $op = $settings.deployment.operatorUrl
        if ($op -and ($op -like 'https://*')) {
            Write-Ok "operatorUrl is HTTPS: $op"
        } else {
            Write-Warn "operatorUrl not HTTPS yet: $op (set in Settings or SETUP -SetOperatorUrl)"
        }
    } catch { }
}

try {
    if ($BaseUrl -notmatch '^https://') { throw 'BaseUrl must be https://' }
    $healthUri = ($BaseUrl.TrimEnd('/')) + '/api/health'
    $resp = Invoke-Me8Https -Uri $healthUri
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300) {
        Write-Ok "GET $healthUri -> $($resp.StatusCode)"
    } else {
        Write-Fail "GET $healthUri -> $($resp.StatusCode)"
        $issues += 'health-status'
    }
} catch {
    Write-Fail "HTTPS health check failed - is Fleet + me8-tls-proxy running? $($_.Exception.Message)"
    $issues += 'health'
}

try {
    $loginUri = ($BaseUrl.TrimEnd('/')) + '/api/auth/session'
    $sess = Invoke-Me8Https -Uri $loginUri
    $setCookie = $sess.Headers['Set-Cookie']
    if (-not $setCookie -and $sess.Headers.ContainsKey('set-cookie')) {
        $setCookie = $sess.Headers['set-cookie']
    }
    if ($setCookie -match 'Secure') {
        Write-Ok 'session cookie includes Secure flag over HTTPS'
    } else {
        Write-Warn 'no Secure Set-Cookie on /api/auth/session (expected after login over HTTPS; trust proxy must be on)'
    }
} catch {
    Write-Warn "session probe skipped: $($_.Exception.Message)"
}

try {
    $probeUri = ($BaseUrl.TrimEnd('/')) + '/login.html'
    $loginPage = Invoke-Me8Https -Uri $probeUri
    if ($loginPage.StatusCode -eq 200) {
        Write-Ok 'login.html served over HTTPS'
    }
} catch {
    Write-Fail "login.html over HTTPS failed: $($_.Exception.Message)"
    $issues += 'login-html'
}

Write-Host ''
if ($issues.Count -eq 0) {
    Write-Host 'VERIFY TLS DASHBOARD: PASS' -ForegroundColor Green
    exit 0
}
Write-Host ('VERIFY TLS DASHBOARD: FAIL (' + $issues.Count + ' checks)') -ForegroundColor Red
exit 1
