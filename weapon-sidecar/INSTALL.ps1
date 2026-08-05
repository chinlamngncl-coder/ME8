# Weapon sidecar — RF-DETR Threat (Apache-2.0)
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

Write-Host 'Installing Weapon RF-DETR packages (first time can take several minutes)...'
& $VenvPy -m pip install --upgrade pip wheel
& $VenvPy -m pip install -r (Join-Path $Root 'requirements.txt')
if ($LASTEXITCODE -ne 0) { throw 'pip install failed' }

New-Item -ItemType Directory -Force -Path (Join-Path $Root 'models') | Out-Null
Write-Host 'Weapon sidecar install OK. Run START-WEAPON.bat'
