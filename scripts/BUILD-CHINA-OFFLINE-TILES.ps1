# Build offline China map tiles for CN Trial pack (Beijing metro bootstrap).
# Full-country: install Java 21+ and Planetiler — see docs in script footer.
param(
    [string]$AppRoot = "C:\Users\user\Desktop\Enterprise Mobility\SaaS Mobility",
    [switch]$SkipBootstrap
)
$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host $msg -ForegroundColor Cyan }

$tilesRoot = Join-Path $AppRoot "data\gis\offline\tiles"
$marker = Join-Path $tilesRoot "3"

if ((Test-Path $marker) -and (Get-ChildItem $tilesRoot -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count -gt 20) {
    Write-Host "Offline tiles already present — skip build." -ForegroundColor Green
    exit 0
}

if ($SkipBootstrap) {
    throw "Offline tiles missing. Run without -SkipBootstrap or place tiles under data\gis\offline\tiles\{z}\{x}\{y}.png"
}

Write-Step "Bootstrap Beijing offline tiles (z3-12, ~few hundred PNGs)..."
Set-Location $AppRoot
node scripts/fetch-china-tiles-bootstrap.js
if ($LASTEXITCODE -ne 0) { throw "Tile bootstrap failed" }

Write-Host ""
Write-Host "BUILD-CHINA-OFFLINE-TILES OK" -ForegroundColor Green
Write-Host "  Tiles: $tilesRoot"
Write-Host ""
Write-Host "For full China coverage later:"
Write-Host "  1. Download https://download.geofabrik.de/asia/china-latest.osm.pbf"
Write-Host "  2. java -jar planetiler.jar --area=china -o china.mbtiles"
Write-Host "  3. mb-util china.mbtiles data\gis\offline\tiles"
