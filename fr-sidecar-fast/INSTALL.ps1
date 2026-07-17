# Install ONNX primary FR sidecar (mob-fr-sidecar-primary-poc)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host "Installing fr-sidecar-fast (ONNX) into .venv ..."
if (-not (Test-Path .\.venv\Scripts\python.exe)) {
  py -3 -m venv .venv
}
& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\pip.exe install -r requirements.txt
Write-Host "Done. Set FM_FR_ENGINE=onnx and restart Fleet."
