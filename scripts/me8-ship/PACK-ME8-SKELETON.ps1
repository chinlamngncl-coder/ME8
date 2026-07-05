# ME8 commercial pack skeleton — stage ship folder without lab storage (dev tree copy).
param(
    [Parameter(Mandatory = $true)][string]$AppRoot,
    [Parameter(Mandatory = $true)][string]$OutRoot,
    [switch]$SkipZip
)
$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host $msg -ForegroundColor Cyan }

function Copy-Tree($src, $dst) {
    if (-not (Test-Path $src)) { return }
    New-Item -ItemType Directory -Force -Path $dst | Out-Null
    robocopy $src $dst /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy failed $src -> $dst ($LASTEXITCODE)" }
}

$AppRoot = (Resolve-Path $AppRoot).Path
if (-not (Test-Path (Join-Path $AppRoot 'server.js'))) { throw "Not ME8 root: $AppRoot" }
$packFresh = Join-Path $AppRoot 'pack\me8-fresh'
if (-not (Test-Path (Join-Path $packFresh 'MANIFEST.json'))) { throw 'pack\me8-fresh missing' }

$ExcludeDirs = @(
    '.git', '.cursor', 'node_modules', 'baseline', 'ship-build-test',
    'storage-lab-backup', 'Important-Mobility-Axiom-Shipping', 'docker'
)
$ExcludeDirPatterns = @('storage-lab-backup-*')

if (Test-Path $OutRoot) {
    Write-Host "Removing existing OutRoot: $OutRoot" -ForegroundColor Yellow
    Remove-Item $OutRoot -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Force -Path $OutRoot | Out-Null

Write-Step "Stage ME8 skeleton -> $OutRoot"
Get-ChildItem $AppRoot -Force | ForEach-Object {
    if ($_.PSIsContainer) {
        if ($ExcludeDirs -contains $_.Name) { return }
        foreach ($pat in $ExcludeDirPatterns) {
            if ($_.Name -like $pat) { return }
        }
        if ($_.Name -eq 'storage') { return }
    }
    if (-not $_.PSIsContainer -and $_.Name -eq '.env') { return }
    $dest = Join-Path $OutRoot $_.Name
    if ($_.PSIsContainer) { Copy-Tree $_.FullName $dest }
    else { Copy-Item $_.FullName $dest -Force }
}

Write-Step 'Factory storage template (no lab bench data)...'
$storageOut = Join-Path $OutRoot 'storage'
New-Item -ItemType Directory -Force -Path $storageOut | Out-Null
$template = Join-Path $packFresh 'storage-template'
$manifest = Get-Content (Join-Path $packFresh 'MANIFEST.json') -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($rel in $manifest.requiredFiles) {
    Copy-Item (Join-Path $template $rel) (Join-Path $storageOut $rel) -Force
}
foreach ($rel in $manifest.emptyDirs) {
    New-Item -ItemType Directory -Force -Path (Join-Path $storageOut $rel) | Out-Null
}

Write-Step 'Partner start launcher...'
$setupBat = Join-Path $AppRoot 'SETUP-ME8.bat'
if (Test-Path $setupBat) { Copy-Item $setupBat (Join-Path $OutRoot 'SETUP-ME8.bat') -Force }

Copy-Item (Join-Path $packFresh 'README.txt') (Join-Path $OutRoot 'ME8-FRESH-INSTALL.txt') -Force

Set-Content (Join-Path $OutRoot 'README.txt') @"
Ubitron ME8
===========

OPERATORS — START HERE:
  CUSTOMER-START.txt

Your partner completes server setup first. You only use the web dashboard.

PARTNER / IT:
  Double-click SETUP-ME8.bat
  docs\ME8-INSTALLER-RUNBOOK.md

Dashboard default: http://<LAN-IP>:3988

Ubitron ship desk: docs\ME8-INTERNAL-SHIP-DESK.md (internal only)
"@ -Encoding UTF8

Write-Step 'VERIFY staged pack (must pass)...'
$verifyScript = Join-Path $AppRoot 'scripts\me8-ship\VERIFY-ME8-FRESH.ps1'
& $verifyScript -AppRoot $OutRoot -Quiet
if ($LASTEXITCODE -ne 0) {
    throw 'VERIFY-ME8-FRESH failed on staged pack — fix before shipping'
}

if (-not $SkipZip) {
    $stamp = Get-Date -Format 'yyyyMMdd-HHmm'
    $zipPath = Join-Path (Split-Path $OutRoot -Parent) ("ME8-Skeleton-$stamp.zip")
    Write-Step "Zip -> $zipPath"
    Compress-Archive -Path (Join-Path $OutRoot '*') -DestinationPath $zipPath -CompressionLevel Optimal
}

$totalFiles = (Get-ChildItem $OutRoot -Recurse -File | Measure-Object).Count
Write-Host ''
Write-Host 'ME8 PACK SKELETON OK' -ForegroundColor Green
Write-Host "  Folder:  $OutRoot"
Write-Host "  Files:   $totalFiles"
Write-Host '  Storage: factory template only (no lab bench)'
if (-not $SkipZip) { Write-Host "  Zip:     $zipPath" }
Write-Host ''
