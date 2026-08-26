# Compile FR / ANPR / Weapon sidecars to onefile executables (PyInstaller).
param(
    [string]$AppRoot = '',
    [string]$OutBin = ''
)
$ErrorActionPreference = 'Stop'

if (-not $AppRoot) { $AppRoot = Split-Path $PSScriptRoot -Parent }
if (-not $OutBin) { $OutBin = Join-Path $AppRoot 'ship-build\compiled\bin' }
New-Item -ItemType Directory -Force -Path $OutBin | Out-Null

function Get-SidecarPython($sideDir) {
    $venv = Join-Path $sideDir '.venv\Scripts\python.exe'
    if (Test-Path $venv) { return $venv }
    throw "PyInstaller needs $sideDir\.venv (run that sidecar INSTALL once on the build machine)."
}

function Build-PyEngine($sideRel, $exeName, $addData) {
    $sideDir = Join-Path $AppRoot $sideRel
    $appPy = Join-Path $sideDir 'app.py'
    if (-not (Test-Path $appPy)) { throw "missing $sideRel\app.py" }
    $py = Get-SidecarPython $sideDir
    Write-Host "[pyengines] pip install pyinstaller ($sideRel)" -ForegroundColor Cyan
    & $py -m pip install --quiet pyinstaller
    if ($LASTEXITCODE -ne 0) { throw "pip pyinstaller failed in $sideRel" }
    $work = Join-Path $AppRoot "ship-build\compiled\pyi-work\$exeName"
    New-Item -ItemType Directory -Force -Path $work | Out-Null
    $args = @(
        '-m', 'PyInstaller',
        '--noconfirm', '--onefile',
        '--name', $exeName,
        '--distpath', $OutBin,
        '--workpath', $work,
        '--specpath', $work,
        '--hidden-import', 'uvicorn',
        '--hidden-import', 'uvicorn.logging',
        '--hidden-import', 'uvicorn.protocols.http.auto',
        '--hidden-import', 'fastapi'
    )
    if ($addData) { $args += @('--add-data', $addData) }
    $args += 'app.py'
    Write-Host "[pyengines] $exeName from $sideRel" -ForegroundColor Cyan
    Push-Location $sideDir
    try {
        & $py @args
        if ($LASTEXITCODE -ne 0) { throw "PyInstaller failed for $exeName" }
    } finally {
        Pop-Location
    }
    $out = Join-Path $OutBin "$exeName.exe"
    if (-not (Test-Path $out)) { throw "missing output $out" }
    Write-Host "[pyengines] wrote $out" -ForegroundColor Green
}

# Default live FR engine is Seeta (uvicorn :8767).
Build-PyEngine 'fr-sidecar-seeta' 'fr-engine' 'vendor;vendor'
Build-PyEngine 'anpr-sidecar' 'anpr-engine' $null
Build-PyEngine 'weapon-sidecar' 'weapon-engine' $null

function Build-RedactionEngine {
    $sideDir = Join-Path $AppRoot 'redaction-track'
    $script = Join-Path $sideDir 'detect_faces.py'
    if (-not (Test-Path $script)) { throw 'missing redaction-track\detect_faces.py' }
    $py = $null
    $redVenv = Join-Path $sideDir '.venv\Scripts\python.exe'
    $seetaDir = Join-Path $AppRoot 'fr-sidecar-seeta'
    if (Test-Path $redVenv) { $py = $redVenv }
    else { $py = Get-SidecarPython $seetaDir }
    Write-Host '[pyengines] pip install pyinstaller + opencv (redaction-track)' -ForegroundColor Cyan
    & $py -m pip install --quiet pyinstaller 'opencv-python>=4.9,<5' 'numpy>=1.24'
    if ($LASTEXITCODE -ne 0) { throw 'pip pyinstaller/opencv failed for redaction-engine' }
    $work = Join-Path $AppRoot 'ship-build\compiled\pyi-work\redaction-engine'
    New-Item -ItemType Directory -Force -Path $work | Out-Null
    $seetaVendor = Join-Path $seetaDir 'vendor\seetaFace6Python'
    $args = @(
        '-m', 'PyInstaller',
        '--noconfirm', '--onefile', '--console',
        '--name', 'redaction-engine',
        '--distpath', $OutBin,
        '--workpath', $work,
        '--specpath', $work,
        '--collect-all', 'cv2',
        '--hidden-import', 'numpy'
    )
    $modelsDir = Join-Path $sideDir 'models'
    if (Test-Path $modelsDir) { $args += @('--add-data', ( $modelsDir + ';models' )) }
    if (Test-Path $seetaVendor) { $args += @('--add-data', ( $seetaVendor + ';vendor/seetaFace6Python' )) }
    $args += 'detect_faces.py'
    Write-Host '[pyengines] redaction-engine from redaction-track' -ForegroundColor Cyan
    Push-Location $sideDir
    try {
        & $py @args
        if ($LASTEXITCODE -ne 0) { throw 'PyInstaller failed for redaction-engine' }
    } finally {
        Pop-Location
    }
    $out = Join-Path $OutBin 'redaction-engine.exe'
    if (-not (Test-Path $out)) { throw "missing output $out" }
    Write-Host "[pyengines] wrote $out" -ForegroundColor Green
}

Build-RedactionEngine

Write-Host '[pyengines] done' -ForegroundColor Green
