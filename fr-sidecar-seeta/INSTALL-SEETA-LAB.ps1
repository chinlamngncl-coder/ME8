# mob-fr-seeta-windows-lab-proof — one-time lab install (Windows)
# 1) Clone already under vendor/seetaFace6Python (or git clone)
# 2) Download SeetaFace6 *.csta models into seetaface/model
# 3) Create venv + pip
#
# Run from ME8 root OR from this folder.

$ErrorActionPreference = "Stop"
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Here

Write-Host "=== Seeta lab install ===" -ForegroundColor Cyan

$Vendor = Join-Path $Here "vendor\seetaFace6Python"
$ModelDir = Join-Path $Vendor "seetaface\model"
$WinDll = Join-Path $Vendor "seetaface\lib\win\libFaceAPI.dll"
$Zip = Join-Path $Here "vendor\sf6.0_models.zip"
$Extract = Join-Path $Here "vendor\sf6_models_extract"

if (-not (Test-Path (Join-Path $Vendor "seetaface\api.py"))) {
    Write-Host "Cloning seetaFace6Python..."
    New-Item -ItemType Directory -Force -Path (Join-Path $Here "vendor") | Out-Null
    git clone --depth 1 https://github.com/tensorflower/seetaFace6Python.git $Vendor
}

if (-not (Test-Path $WinDll)) {
    Write-Host "ERROR: Windows DLLs missing under seetaface\lib\win" -ForegroundColor Red
    exit 1
}

New-Item -ItemType Directory -Force -Path $ModelDir | Out-Null
$need = @("face_detector.csta", "face_landmarker_pts5.csta", "face_recognizer.csta")
$missing = @($need | Where-Object { -not (Test-Path (Join-Path $ModelDir $_)) })

if ($missing.Count -gt 0) {
    Write-Host "Models missing: $($missing -join ', ')"
    Write-Host "Downloading SeetaFace6 models (~288MB Dropbox)..."
    if (-not (Test-Path $Zip) -or ((Get-Item $Zip).Length -lt 1000000)) {
        & curl.exe -L --retry 3 --connect-timeout 30 --max-time 900 -o $Zip "https://www.dropbox.com/s/julk1f16riu0dyp/sf6.0_models.zip?dl=1"
    }
    if (-not (Test-Path $Zip) -or ((Get-Item $Zip).Length -lt 1000000)) {
        Write-Host "AUTO DOWNLOAD FAILED." -ForegroundColor Yellow
        Write-Host "Manual: download models zip from SeetaFace6Open Dropbox / Baidu,"
        Write-Host "extract ALL *.csta into:"
        Write-Host "  $ModelDir"
        Write-Host "Required at minimum: face_detector.csta, face_landmarker_pts5.csta, face_recognizer.csta"
        exit 2
    }
    Write-Host "Extracting models..."
    if (Test-Path $Extract) { Remove-Item $Extract -Recurse -Force }
    Expand-Archive -Path $Zip -DestinationPath $Extract -Force
    Get-ChildItem $Extract -Recurse -Filter "*.csta" | ForEach-Object {
        Copy-Item $_.FullName -Destination (Join-Path $ModelDir $_.Name) -Force
    }
}

$still = @($need | Where-Object { -not (Test-Path (Join-Path $ModelDir $_)) })
if ($still.Count -gt 0) {
    Write-Host "Still missing after extract: $($still -join ', ')" -ForegroundColor Red
    exit 3
}

$VenvPy = Join-Path $Here ".venv\Scripts\python.exe"
if (-not (Test-Path $VenvPy)) {
    Write-Host "Creating venv..."
    py -3 -m venv .venv
}
Write-Host "pip install..."
& $VenvPy -m pip install -U pip
& $VenvPy -m pip install -r requirements.txt

Write-Host ""
Write-Host "OK - start lab sidecar:" -ForegroundColor Green
Write-Host "  .\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8767"
Write-Host "Or double-click START-SEETA-LAB.bat"
Write-Host "Health: http://127.0.0.1:8767/health"
Write-Host "Test page (Fleet up): http://<LAN-IP>:3988/test-seeta.html  (same IP as dashboard, not 127.0.0.1)"
