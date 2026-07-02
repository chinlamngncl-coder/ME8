# Verify demo-2 offline raster tiles (11 regions / 7 countries).
param(
    [string]$AppRoot = "C:\Users\user\Desktop\Enterprise Mobility\mobility-8bwc-lab",
    [string]$ApiBase = "",
    [switch]$Json
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path $AppRoot)) { throw "App root not found: $AppRoot" }
Set-Location $AppRoot

$nodeArgs = @("scripts/verify-offline-tiles.js", "--all-demo2")
if ($ApiBase) { $nodeArgs += @("--api", $ApiBase) }
if ($Json) { $nodeArgs += "--json" }

node @nodeArgs
if ($LASTEXITCODE -ne 0) { throw "VERIFY-LAB-OFFLINE-TILES failed" }
Write-Host "VERIFY-LAB-OFFLINE-TILES OK" -ForegroundColor Green
