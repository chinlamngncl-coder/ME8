# Mobility C2 — first-time rental / on-prem setup
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "Mobility C2 — npm install (includes ffmpeg-static download)..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Verify bundled ffmpeg..." -ForegroundColor Cyan
node scripts/verify-install.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Centre Summary AI (vendor bundle or one-time download)..." -ForegroundColor Cyan
node scripts/prepare-centre-llm.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example — edit HOST, passwords, FM_RENTAL_MODE=1" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next: edit .env, then start with node server.js or RESTART-FLEET.bat" -ForegroundColor Green
Write-Host "Docs: docs\RENTAL-READINESS.md and docs\DEPLOYMENT-MANUAL.md" -ForegroundColor Green
