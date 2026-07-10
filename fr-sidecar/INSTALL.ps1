# One-time install of face matching packages for START-FR.bat / demo PC.
# Operator path: double-click START-FR.bat in the ME8 folder (do not use this script by hand).
$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
Set-Location $Root
Write-Host 'Face recognition — installing packages (first time only)...'
if (-not (Test-Path .\.venv\Scripts\python.exe)) {
    Write-Host 'Creating local Python environment...'
    py -3 -m venv .venv
    if ($LASTEXITCODE -ne 0) {
        python -m venv .venv
    }
}
& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\pip.exe install -r requirements.txt
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'Install finished. START-FR.bat will start the service.'
