# Requires HOST_IP env (or arg). Writes deploy .env for runtime + Docker.
param(
    [string]$HostIp = $env:HOST_IP,
    [string]$EnvFile = '.env',
    [string]$AlsoCopyTo = ''
)
$ErrorActionPreference = 'Stop'
if (-not $HostIp) { $HostIp = '127.0.0.1' }

$EnvFile = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($EnvFile)
$parent = Split-Path -Parent $EnvFile
if ($parent -and -not (Test-Path $parent)) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }

$templateCandidates = @(
    (Join-Path (Split-Path -Parent $EnvFile) '.env.deploy.example'),
    (Join-Path (Get-Location) '.env.deploy.example'),
    (Join-Path (Split-Path -Parent (Get-Location)) '.env.deploy.example')
)

if (-not (Test-Path $EnvFile)) {
    $copied = $false
    foreach ($t in $templateCandidates) {
        if (Test-Path $t) {
            Copy-Item $t $EnvFile -Force
            $copied = $true
            break
        }
    }
    if (-not $copied) { Set-Content $EnvFile "HOST=$HostIp`n" -Encoding UTF8 }
}

$c = Get-Content $EnvFile -Raw -ErrorAction SilentlyContinue
if ($null -eq $c) { $c = '' }

function Set-EnvLine([string]$key, [string]$value) {
    if ($c -match "(?m)^$([regex]::Escape($key))=") {
        $script:c = [regex]::Replace($c, "(?m)^$([regex]::Escape($key))=.*$", "$key=$value")
    } else {
        if ($c -and -not $c.EndsWith("`n")) { $script:c += "`r`n" }
        $script:c += "$key=$value`r`n"
    }
}

Set-EnvLine 'HOST' $HostIp
Set-EnvLine 'FM_GB28181_PUBLIC_HOST' $HostIp
Set-EnvLine 'FM_WVP_STREAM_HOST' $HostIp
Set-EnvLine 'WVP_HOST_IP' $HostIp
Set-EnvLine 'WVP_HOST' $HostIp
Set-EnvLine 'FM_AIRGAP_LICENSE_REQUIRED' '1'
Set-EnvLine 'FM_HTTP_PORT' '3888'
# CN air-gap pack: suspend dashboard QR/TOTP enroll + login challenge
Set-EnvLine 'FM_TOTP_SUSPENDED' '1'
Set-EnvLine 'FM_CATALOG_MODE' 'postgres_required'
Set-EnvLine 'FM_CATALOG_DB_URL' 'postgresql://mobility:change_me_pg@127.0.0.1:5432/mobility'
Set-EnvLine 'FM_REDIS_URL' 'redis://127.0.0.1:6379'
Set-EnvLine 'MOBILITY_POSTGRES_USER' 'mobility'
Set-EnvLine 'MOBILITY_POSTGRES_PASSWORD' 'change_me_pg'
Set-EnvLine 'MOBILITY_POSTGRES_DB' 'mobility'
if ($c -notmatch '(?m)^GB_PLATFORM_ID=') { Set-EnvLine 'GB_PLATFORM_ID' '99999900002000000001' }
if ($c -notmatch '(?m)^GB_DOMAIN=') { Set-EnvLine 'GB_DOMAIN' '9999990000' }
if ($c -notmatch '(?m)^WVP_ID=') { Set-EnvLine 'WVP_ID' '99999900002000000001' }
if ($c -notmatch '(?m)^WVP_DOMAIN=') { Set-EnvLine 'WVP_DOMAIN' '9999990000' }

Set-Content -Path $EnvFile -Value $c -Encoding UTF8
Write-Host "Updated $EnvFile HOST=$HostIp"

if ($AlsoCopyTo) {
    $AlsoCopyTo = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($AlsoCopyTo)
    $ap = Split-Path -Parent $AlsoCopyTo
    if ($ap -and -not (Test-Path $ap)) { New-Item -ItemType Directory -Force -Path $ap | Out-Null }
    Copy-Item -Force $EnvFile $AlsoCopyTo
    Write-Host "Also copied to $AlsoCopyTo"
}
