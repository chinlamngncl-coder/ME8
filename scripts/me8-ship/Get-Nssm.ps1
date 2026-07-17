# Resolve NSSM for Ubitron C2 Windows service (download once if missing).
param([string]$AppRoot = '')
$ErrorActionPreference = 'Stop'

function Resolve-Me8Root([string]$Start) {
    if ($Start -and (Test-Path (Join-Path $Start 'server.js'))) { return (Resolve-Path $Start).Path }
    $here = $PSScriptRoot
    $parent = Split-Path $here -Parent
    $grand = Split-Path $parent -Parent
    if (Test-Path (Join-Path $grand 'server.js')) { return $grand }
    if (Test-Path (Join-Path $parent 'server.js')) { return $parent }
    throw 'ME8 AppRoot not found'
}

if (-not $AppRoot) { $AppRoot = Resolve-Me8Root '' }
else { $AppRoot = (Resolve-Path $AppRoot).Path }

$nssmDir = Join-Path $AppRoot 'scripts\runtime\nssm\win64'
$nssm = Join-Path $nssmDir 'nssm.exe'
if (Test-Path $nssm) { return $nssm }

$onPath = Get-Command nssm -ErrorAction SilentlyContinue
if ($onPath -and $onPath.Source) { return $onPath.Source }

Write-Host '  Downloading NSSM 2.24 (one-time, service wrapper)...' -ForegroundColor Gray
New-Item -ItemType Directory -Force -Path $nssmDir | Out-Null
$zip = Join-Path $env:TEMP 'nssm-2.24.zip'
$extract = Join-Path $env:TEMP 'nssm-2.24-extract'
if (Test-Path $extract) { Remove-Item $extract -Recurse -Force -ErrorAction SilentlyContinue }
Invoke-WebRequest -Uri 'https://nssm.cc/release/nssm-2.24.zip' -OutFile $zip -UseBasicParsing
Expand-Archive -Path $zip -DestinationPath $extract -Force
$src = Join-Path $extract 'nssm-2.24\win64\nssm.exe'
if (-not (Test-Path $src)) { throw 'NSSM download failed — place nssm.exe in scripts\runtime\nssm\win64\' }
Copy-Item $src $nssm -Force
try { Remove-Item $zip -Force -ErrorAction SilentlyContinue } catch { }
return $nssm
