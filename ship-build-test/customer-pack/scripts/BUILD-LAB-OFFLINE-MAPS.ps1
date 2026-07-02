# Lane B lab — offline raster tiles (demo-2: 7 countries / 11 regions) + optional PMTiles.

param(

    [string]$AppRoot = "C:\Users\user\Desktop\Enterprise Mobility\mobility-8bwc-lab",

    [string[]]$Countries = @(),

    [string[]]$Regions = @(),

    [switch]$AllDemo2,

    [switch]$SkipPmtiles,

    [switch]$ListOnly

)

$ErrorActionPreference = "Stop"



function Write-Step($msg) { Write-Host $msg -ForegroundColor Cyan }



if (-not (Test-Path $AppRoot)) { throw "App root not found: $AppRoot" }

Set-Location $AppRoot



if ($ListOnly) {

    node scripts/fetch-offline-tiles-bootstrap.js --list

    exit 0

}



$nodeArgs = @("scripts/fetch-offline-tiles-bootstrap.js")

if ($AllDemo2 -or ($Countries.Count -eq 0 -and $Regions.Count -eq 0)) {

    Write-Step "Demo-2 offline raster tiles (sg, ph, id, th, kr, cn x4, za x2 - no Malaysia)..."

    $nodeArgs += "--all-demo2"

} else {

    foreach ($c in $Countries) { $nodeArgs += @("--country", $c) }

    foreach ($r in $Regions) { $nodeArgs += @("--region", $r) }

    Write-Step ("Offline raster tiles: " + ($nodeArgs -join " "))

}



node @nodeArgs

if ($LASTEXITCODE -ne 0) { throw "Raster tile bootstrap failed" }



Write-Step "Verify offline tiles (11 regions)..."

node scripts/verify-offline-tiles.js --all-demo2

if ($LASTEXITCODE -ne 0) { throw "Offline tile verify failed — re-run bootstrap or check storage/offline-tiles-build.log" }



if (-not $SkipPmtiles) {

    Write-Step "PMTiles sample extract (optional; requires pmtiles CLI)..."

    node scripts/fetch-lab-pmtiles-sample.js

}



Write-Host ""

Write-Host "BUILD-LAB-OFFLINE-MAPS OK" -ForegroundColor Green

Write-Host "  Tiles:   $AppRoot\data\gis\offline\tiles"

Write-Host "  PMTiles: $AppRoot\data\gis\offline\pmtiles"

Write-Host ""

Write-Host "Hard-refresh dashboard. Test each map region (fm-map-countries meta)."


