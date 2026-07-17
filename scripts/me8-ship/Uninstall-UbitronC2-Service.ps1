# Remove Ubitron Mobility C2 Windows service (lab rollback or reinstall).
param([string]$AppRoot = '')
$ErrorActionPreference = 'Stop'

$ServiceName = 'UbitronC2'

function Resolve-Me8Root([string]$Start) {
    if ($Start -and (Test-Path (Join-Path $Start 'server.js'))) { return (Resolve-Path $Start).Path }
    $here = $PSScriptRoot
    $parent = Split-Path $here -Parent
    $grand = Split-Path $parent -Parent
    if (Test-Path (Join-Path $grand 'server.js')) { return $grand }
    if (Test-Path (Join-Path $parent 'server.js')) { return $parent }
    throw 'ME8 AppRoot not found'
}

function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p = New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Admin)) {
    Write-Host 'ERROR: Run PowerShell as Administrator.' -ForegroundColor Red
    exit 1
}

if (-not $AppRoot) { $AppRoot = Resolve-Me8Root '' }
else { $AppRoot = (Resolve-Path $AppRoot).Path }

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $existing) {
    Write-Host "Service $ServiceName is not installed." -ForegroundColor Yellow
    exit 0
}

$nssm = & (Join-Path $PSScriptRoot 'Get-Nssm.ps1') -AppRoot $AppRoot
Write-Host "Stopping and removing $ServiceName..." -ForegroundColor Cyan
& $nssm stop $ServiceName confirm 2>$null | Out-Null
Start-Sleep -Seconds 2
& $nssm remove $ServiceName confirm
Write-Host 'Service removed. Use RESTART-FLEET.bat for lab console mode if needed.' -ForegroundColor Green
