# INSTALL-ZLM-PACK.ps1 — mvp-zlm-in-pack
# Copy a Windows MediaServer build into vendor/zlmediakit for Fleet child spawn.
# Does NOT use Docker (Linux image cannot ship as Windows MediaServer.exe).

param(
    [string]$SourceDir = '',
    [string]$AppRoot = ''
)

$ErrorActionPreference = 'Stop'
if (-not $AppRoot) {
    $AppRoot = Split-Path -Parent $PSScriptRoot
}
$Vendor = Join-Path $AppRoot 'vendor\zlmediakit'
New-Item -ItemType Directory -Force -Path $Vendor | Out-Null

Write-Host "=== INSTALL ZLM pack binary ===" -ForegroundColor Cyan
Write-Host "Target: $Vendor"

if (-not $SourceDir) {
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\scripts\INSTALL-ZLM-PACK.ps1 -SourceDir `"C:\path\to\windows\zlm\folder`""
    Write-Host ""
    Write-Host "That folder must contain MediaServer.exe (Windows build)."
    Write-Host "See vendor\zlmediakit\README.md"
    if (Test-Path (Join-Path $Vendor 'MediaServer.exe')) {
        Write-Host ""
        Write-Host "[ok] MediaServer.exe already present." -ForegroundColor Green
        exit 0
    }
    exit 2
}

$exe = Join-Path $SourceDir 'MediaServer.exe'
if (-not (Test-Path $exe)) {
    $found = Get-ChildItem $SourceDir -Recurse -Filter 'MediaServer.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { $exe = $found.FullName }
}
if (-not (Test-Path $exe)) {
    Write-Host "ERROR: MediaServer.exe not found under $SourceDir" -ForegroundColor Red
    exit 1
}

Copy-Item $exe (Join-Path $Vendor 'MediaServer.exe') -Force
Write-Host "Copied MediaServer.exe"

Get-ChildItem (Split-Path $exe -Parent) -Filter '*.dll' -File -ErrorAction SilentlyContinue | ForEach-Object {
    Copy-Item $_.FullName (Join-Path $Vendor $_.Name) -Force
    Write-Host "Copied $($_.Name)"
}

$cfgExample = Join-Path $Vendor 'config.ini.example'
$cfg = Join-Path $Vendor 'config.ini'
if (-not (Test-Path $cfg) -and (Test-Path $cfgExample)) {
    Copy-Item $cfgExample $cfg -Force
    Write-Host "Wrote config.ini from example — set [api] secret = FM_ZLM_SECRET in .env"
}

Write-Host ""
Write-Host "OK — set in .env:" -ForegroundColor Green
Write-Host "  FM_ZLM_ENABLED=1"
Write-Host "  FM_ZLM_SPAWN=1"
Write-Host "  FM_ZLM_PACK=1"
Write-Host "  FM_ZLM_HTTP=http://127.0.0.1:8080"
Write-Host "  FM_ZLM_RTMP=rtmp://127.0.0.1:19350"
Write-Host "  FM_ZLM_SECRET=<same as config.ini>"
Write-Host "Then RESTART-FLEET.bat"
