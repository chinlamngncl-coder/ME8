# Mobility Axiom — APAC trial DELIVERY pack (no source, no lab data).
param(
    [string]$AppRoot = "C:\Users\user\Desktop\Enterprise Mobility\SaaS Mobility",
    [string]$OutRoot = "C:\Users\user\Desktop\Trial June Mobility Axiom",
    [switch]$SkipZip
)
$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host $msg -ForegroundColor Cyan }

Write-Step "Build i18n locales..."
Set-Location $AppRoot
node scripts/build-i18n-locales.js
if ($LASTEXITCODE -ne 0) { throw "i18n build failed" }

Write-Step "Generate trial manuals..."
node scripts/generate-trial-manuals.js
if ($LASTEXITCODE -ne 0) { throw "manual generation failed" }

$shipArgs = @{
    AppRoot  = $AppRoot
    OutRoot  = $OutRoot
    Variant  = 'Apac'
}
if ($SkipZip) { $shipArgs.SkipZip = $true }

& (Join-Path $AppRoot "scripts\PACK-SHIP-DELIVERY.ps1") @shipArgs
if (-not $?) { throw "delivery pack failed" }
