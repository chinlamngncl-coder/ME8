# Regenerates localized manuals from manuals-expanded/ -> manuals-src/
$root = Split-Path $PSScriptRoot -Parent
Set-Location (Split-Path $root -Parent)
node scripts/trial-ship/emit-expanded-manuals.js
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host 'manuals-src updated from manuals-expanded'
