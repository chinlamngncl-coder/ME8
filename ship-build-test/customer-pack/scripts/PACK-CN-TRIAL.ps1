# CN Trial Mobility — DELIVERY pack (no source, no lab data, en+zh, offline map).
param(
    [string]$AppRoot = "C:\Users\user\Desktop\Enterprise Mobility\SaaS Mobility",
    [string]$OutRoot = "C:\Users\user\Desktop\CN Trial Mobility",
    [switch]$SkipTiles,
    [switch]$SkipZip
)
$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host $msg -ForegroundColor Cyan }

Set-Location $AppRoot

if (-not (Test-Path (Join-Path $AppRoot "public\locales\zh.json"))) {
    Write-Step "Build zh locale..."
    node scripts/build-zh-locale.js
    if ($LASTEXITCODE -ne 0) { throw "zh locale build failed" }
}

if (-not $SkipTiles) {
    $tilesMarker = Join-Path $AppRoot "data\gis\offline\tiles\3"
    if (-not (Test-Path $tilesMarker)) {
        Write-Step "Build China offline tiles..."
        & (Join-Path $AppRoot "scripts\BUILD-CHINA-OFFLINE-TILES.ps1") -AppRoot $AppRoot
        if ($LASTEXITCODE -ne 0) { throw "tile build failed" }
    }
}

$shipArgs = @{
    AppRoot = $AppRoot
    OutRoot = $OutRoot
    Variant = 'Cn'
}
if ($SkipZip) { $shipArgs.SkipZip = $true }

& (Join-Path $AppRoot "scripts\PACK-SHIP-DELIVERY.ps1") @shipArgs
if (-not $?) { throw "CN delivery pack failed" }
