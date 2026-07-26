# Restore ME8 to Settings-UI-Target-A-PASS backup
# ONLY when user types: RUN RESTORE-ME8-PRE-SETTINGS-UI-FALLBACK
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
Write-Host 'RESTORE ME8 Settings-UI-Target-A-PASS backup'
Write-Host "  FROM $baseline"; Write-Host "  INTO $AppRoot"; Write-Host "  version $($manifest.version)"; Write-Host ''
$restored = 0; $skipped = 0
foreach ($entry in $manifest.files) {
    $rel = $entry.path -replace '/', '\'
    $src = Join-Path $baseline $rel
    $dst = Join-Path $AppRoot $rel
    # SNAP scripts restore into baseline folder only when path has no slash â€” skip writing SNAP into AppRoot root as weird; allow restore of wrappers to AppRoot
    if ($entry.path -match '-SNAP\.ps1$') {
        # keep SNAP only inside baseline; do not copy over AppRoot
        Write-Host "  keep-baseline $($entry.path)"
        continue
    }
    if (-not (Test-Path $src)) { Write-Host "  SKIP missing: $rel" -ForegroundColor Red; $skipped++; continue }
    $dir = Split-Path $dst -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    Copy-Item $src $dst -Force
    Write-Host "  restored $rel"
    $restored++
}
Write-Host ''
if ($skipped -gt 0) { Write-Host "FAILED: $skipped missing" -ForegroundColor Red; exit 1 }
Write-Host "Restored $restored file(s)."
Write-Host 'Next: .\RESTART-FLEET.bat then Ctrl+F5'
Write-Host 'See BASELINE-ME8-SETTINGS-UI-TARGET-A-PASS.md'
