# Restore ME8 to POC/Demo baseline — run ONLY when you explicitly choose rollback.
param([string]$AppRoot = '')
$ErrorActionPreference = 'Stop'
$baseline = $PSScriptRoot
if (-not $AppRoot) {
    $AppRoot = Resolve-Path (Join-Path $baseline '..\..')
    if (-not (Test-Path (Join-Path $AppRoot 'server.js'))) {
        $AppRoot = 'C:\Users\user\Desktop\Enterprise Mobility\ME8'
    }
}

$manifest = Get-Content (Join-Path $baseline 'MANIFEST.json') -Raw | ConvertFrom-Json
Write-Host 'RESTORE ME8 POC/Demo'
Write-Host "  FROM $baseline"
Write-Host "  INTO $AppRoot"
Write-Host ''

$restored = 0
$skipped = 0
foreach ($entry in $manifest.files) {
    $rel = $entry.path -replace '/', '\'
    $src = Join-Path $baseline $rel
    $dst = Join-Path $AppRoot $rel
    if (-not (Test-Path $src)) {
        Write-Host "  SKIP missing in baseline: $rel" -ForegroundColor Red
        $skipped++
        continue
    }
    $dir = Split-Path $dst -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    Copy-Item $src $dst -Force
    Write-Host "  restored $rel"
    $restored++
}

Write-Host ''
if ($skipped -gt 0) {
    Write-Host "FAILED: $skipped file(s) missing from baseline snapshot." -ForegroundColor Red
    exit 1
}
Write-Host "Restored $restored file(s)."
Write-Host ''
Write-Host 'Next:'
Write-Host '  1. .\RESTART-FLEET.bat'
Write-Host '  2. Hard refresh dashboard: Ctrl+Shift+R'
Write-Host 'See BASELINE-ME8-POC-DEMO.md'
