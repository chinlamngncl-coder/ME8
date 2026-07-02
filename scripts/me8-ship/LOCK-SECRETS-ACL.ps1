# Restrict storage/secrets/ to SYSTEM, Administrators, and the current user.
param(
    [string]$AppRoot = ''
)
$ErrorActionPreference = 'Stop'

function Get-Me8AppRoot {
    param([string]$Start)
    if ($Start -and (Test-Path (Join-Path $Start 'server.js'))) { return (Resolve-Path $Start).Path }
    $here = $PSScriptRoot
    $grand = Split-Path (Split-Path $here -Parent) -Parent
    if (Test-Path (Join-Path $grand 'server.js')) { return $grand }
    throw 'ME8 AppRoot not found — pass -AppRoot'
}

if (-not $AppRoot) { $AppRoot = Get-Me8AppRoot -Start '' }
else { $AppRoot = (Resolve-Path $AppRoot).Path }

$secretsDir = Join-Path $AppRoot 'storage\secrets'
if (-not (Test-Path $secretsDir)) {
    New-Item -ItemType Directory -Force -Path $secretsDir | Out-Null
}

$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
icacls $secretsDir /inheritance:r | Out-Null
icacls $secretsDir /grant:r "SYSTEM:(OI)(CI)F" | Out-Null
icacls $secretsDir /grant:r "Administrators:(OI)(CI)F" | Out-Null
icacls $secretsDir /grant:r "${identity}:(OI)(CI)F" | Out-Null

Get-ChildItem -Path $secretsDir -Force -File | ForEach-Object {
    icacls $_.FullName /inheritance:r | Out-Null
    icacls $_.FullName /grant:r "SYSTEM:F" | Out-Null
    icacls $_.FullName /grant:r "Administrators:F" | Out-Null
    icacls $_.FullName /grant:r "${identity}:F" | Out-Null
}

Write-Host "Secrets ACL locked: $secretsDir ($identity)" -ForegroundColor Green
