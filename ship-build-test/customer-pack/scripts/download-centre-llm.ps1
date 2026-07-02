# Vendor — download AI model into vendor/llm/ before shipping installers to customers
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "Centre Summary AI — vendor model download (~2 GB, one-time)" -ForegroundColor Cyan
node scripts/download-centre-llm.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Ship folder vendor\llm\ with your customer package." -ForegroundColor Green
