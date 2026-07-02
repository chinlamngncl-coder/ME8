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
    'storage-lab-backup', 'Important-Mobility-Axiom-Shipping'
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

Write-Step 'Customer env template...'
Copy-Item (Join-Path $AppRoot '.env.me8.example') (Join-Path $OutRoot '.env.me8.example') -Force
Copy-Item (Join-Path $AppRoot '.env.me8.example') (Join-Path $OutRoot '.env.example') -Force

Write-Step 'Install + verify launchers at pack root...'
Copy-Item (Join-Path $AppRoot 'NEW-ME8-INSTALL.ps1') (Join-Path $OutRoot 'NEW-ME8-INSTALL.ps1') -Force
Copy-Item (Join-Path $AppRoot 'VERIFY-ME8-FRESH.ps1') (Join-Path $OutRoot 'VERIFY-ME8-FRESH.ps1') -Force
Copy-Item (Join-Path $packFresh 'README.txt') (Join-Path $OutRoot 'ME8-FRESH-INSTALL.txt') -Force

Set-Content (Join-Path $OutRoot 'README.txt') @"
Ubitron ME8 — commercial pack skeleton
======================================

NOT a trial delivery pack (trial stays on SaaS Mobility :3888).
ME8 listens on :3988 by default.

INSTALL (customer server)
  1. Copy this folder to e.g. C:\Ubitron-ME8\
  2. npm install   (Node 18+ required — skeleton does not bundle Node yet)
  3. Run NEW-ME8-INSTALL.ps1  (factory storage + .env from template)
  4. Edit .env — set YOUR_LAN_IP, FTP user/pass, SIP secrets
  5. RESTART-FLEET.bat
  6. VERIFY-ME8-FRESH.ps1  (must pass before handoff)

First login: global / global123 — change super-admin password immediately.

See ME8-FRESH-INSTALL.txt for detail.
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
