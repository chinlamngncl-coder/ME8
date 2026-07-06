# download-ffmpeg-lgpl.ps1
# Downloads the official LGPL Windows FFmpeg build and places ffmpeg.exe in vendor/ffmpeg-lgpl/.
# Run once at the office before building a customer pack. Requires internet access.
# License: FFmpeg LGPL — safe to bundle with commercial software.

$ErrorActionPreference = "Stop"

$Root       = Split-Path $PSScriptRoot -Parent
$VendorDir  = Join-Path $Root "vendor\ffmpeg-lgpl"
$OutExe     = Join-Path $VendorDir "ffmpeg.exe"
$TmpZip     = Join-Path $env:TEMP "ffmpeg-lgpl-essentials.zip"
$TmpExtract = Join-Path $env:TEMP "ffmpeg-lgpl-extract"

# Source: gyan.dev release-essentials (LGPL-only codec set, Windows x64)
$DownloadUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"

if (Test-Path $OutExe) {
    Write-Host "[ok] ffmpeg.exe already exists at vendor\ffmpeg-lgpl\ffmpeg.exe" -ForegroundColor Green
    Write-Host "     Delete it and re-run this script to force a fresh download." -ForegroundColor Gray
    exit 0
}

Write-Host ""
Write-Host "Downloading FFmpeg LGPL build (~80 MB)..." -ForegroundColor Cyan
Write-Host "  Source : $DownloadUrl" -ForegroundColor Gray
Write-Host "  Target : $OutExe" -ForegroundColor Gray
Write-Host ""

New-Item -ItemType Directory -Force -Path $VendorDir | Out-Null

try {
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $TmpZip -UseBasicParsing
} catch {
    Write-Host "[fail] Download failed: $_" -ForegroundColor Red
    Write-Host "       Check your internet connection and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host "Extracting..." -ForegroundColor Cyan
if (Test-Path $TmpExtract) { Remove-Item $TmpExtract -Recurse -Force }
Expand-Archive -Path $TmpZip -DestinationPath $TmpExtract -Force

$FfmpegExe = Get-ChildItem -Path $TmpExtract -Recurse -Filter "ffmpeg.exe" |
             Where-Object { $_.FullName -match "\\bin\\ffmpeg\.exe$" } |
             Select-Object -First 1

if (-not $FfmpegExe) {
    Write-Host "[fail] ffmpeg.exe not found inside the zip." -ForegroundColor Red
    exit 1
}

Copy-Item -Path $FfmpegExe.FullName -Destination $OutExe -Force

Remove-Item $TmpZip -Force -ErrorAction SilentlyContinue
Remove-Item $TmpExtract -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "[ok] FFmpeg LGPL build installed:" -ForegroundColor Green
Write-Host "     $OutExe" -ForegroundColor Green
Write-Host ""
Write-Host "Next: run  node scripts/verify-install.js  to confirm." -ForegroundColor Cyan
