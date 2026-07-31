# ANPR INSTALL — FastALPR ship default + optional paddle hatch
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$Py = $null
foreach ($c in @('py -3.11', 'py -3.10', 'py -3', 'python')) {
    try {
        $ver = & cmd /c "$c --version 2>&1"
        if ($LASTEXITCODE -eq 0) { $Py = $c; break }
    } catch { }
}
if (-not $Py) {
    Write-Host 'ERROR: Python 3 not found on PATH.'
    exit 1
}

$VenvPy = Join-Path $Root '.venv\Scripts\python.exe'
if (-not (Test-Path $VenvPy)) {
    Write-Host "Creating venv with $Py ..."
    & cmd /c "$Py -m venv .venv"
    if ($LASTEXITCODE -ne 0) { throw 'venv failed' }
}

Write-Host 'Upgrading pip...'
& $VenvPy -m pip install --upgrade pip wheel
Write-Host 'Installing ANPR ship requirements (FastALPR / OpenCV / onnxruntime)...'
& $VenvPy -m pip install -r (Join-Path $Root 'requirements.txt')
if ($LASTEXITCODE -ne 0) { throw 'pip install failed' }
if ($env:OS -match 'Windows') {
    & $VenvPy -m pip install "protobuf>=3.19.0,<=3.20.2" | Out-Null
}

$Models = Join-Path $Root 'models'
New-Item -ItemType Directory -Force -Path $Models | Out-Null

Write-Host 'Warming FastALPR power-crop models (512 + 384 fallback; first download may take a minute)...'
& $VenvPy -c "from fast_alpr import ALPR; ALPR(detector_model='yolo-v9-t-512-license-plate-end2end', ocr_model='cct-xs-v2-global-model', ocr_device='cpu', detector_conf_thresh=0.18); ALPR(detector_model='yolo-v9-t-384-license-plate-end2end', ocr_model='cct-xs-v2-global-model', ocr_device='cpu', detector_conf_thresh=0.14); print('FastALPR power-crop warm OK')"
if ($LASTEXITCODE -ne 0) {
    Write-Host 'WARN: FastALPR warm failed — first START-ANPR.bat will download models.'
}

$VehicleOnnx = Join-Path $Models 'yolov8n-coco.onnx'
if (-not (Test-Path $VehicleOnnx)) {
    Write-Host 'Downloading COCO vehicle ONNX (car/moto/bus/truck) for Live scene crops...'
    $urls = @(
        'https://github.com/THU-MIG/yolov10/releases/download/v1.1/yolov10n.onnx'
    )
    $ok = $false
    foreach ($u in $urls) {
        try {
            Invoke-WebRequest -Uri $u -OutFile ($VehicleOnnx + '.tmp') -UseBasicParsing -TimeoutSec 120
            if ((Get-Item ($VehicleOnnx + '.tmp')).Length -gt 1000000) {
                Move-Item -Force ($VehicleOnnx + '.tmp') $VehicleOnnx
                Write-Host "Vehicle ONNX OK: $VehicleOnnx"
                $ok = $true
                break
            }
        } catch {
            Write-Host "WARN: vehicle download fail from $u"
        }
    }
    if (-not $ok) {
        Write-Host 'WARN: vehicle ONNX missing — Live will plate-only until models/yolov8n-coco.onnx exists.'
    }
} else {
    Write-Host "Vehicle ONNX present: $VehicleOnnx"
}

Write-Host ''
Write-Host 'INSTALL OK. Ship: vehicle scene + FastALPR plate (FM_ANPR_ENGINE=fastalpr).'
Write-Host 'Start with START-ANPR.bat from ME8 root.'
