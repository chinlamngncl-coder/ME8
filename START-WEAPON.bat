@echo off
title Ubitron — Start Weapon (RF-DETR)
cd /d "%~dp0"

if exist "%~dp0bin\weapon-engine.exe" (
  echo Starting compiled Weapon engine...
  "%~dp0bin\weapon-engine.exe"
  goto :eof
)

echo.
echo  Mobility Axiom — Weapon sidecar (RF-DETR Threat, Apache-2.0)
echo  Folder: %~dp0weapon-sidecar
echo  Leave THIS window open while using Analytics - Weapon.
echo.

where py >nul 2>&1
if errorlevel 1 (
  where python >nul 2>&1
  if errorlevel 1 (
    echo  ERROR: Python 3 is not installed or not on PATH.
    pause
    exit /b 1
  )
)

set "WD_PY=%~dp0weapon-sidecar\.venv\Scripts\python.exe"
set "NEED_INSTALL=0"

if not exist "%WD_PY%" set "NEED_INSTALL=1"
if "%NEED_INSTALL%"=="0" (
  "%WD_PY%" -c "import uvicorn,rfdetr" >nul 2>&1
  if errorlevel 1 set "NEED_INSTALL=1"
)

if "%NEED_INSTALL%"=="1" (
  echo  First-time setup — installing Weapon packages...
  echo  This can take several minutes. Leave this window open.
  echo.
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0weapon-sidecar\INSTALL.ps1"
  if errorlevel 1 (
    echo  Install failed.
    pause
    exit /b 1
  )
)

REM AIRGAP-SIDECAR-NO-DOWNLOAD-V1 — weights pre-flight: fail closed in < 2 s, never download.
set "WD_HAVE_WEIGHTS=0"
if exist "%~dp0weapon-sidecar\models\checkpoint_best_total.pth" set "WD_HAVE_WEIGHTS=1"
if exist "%~dp0weapon-sidecar\models\checkpoint_pistol_smoke.pth" set "WD_HAVE_WEIGHTS=1"
if exist "%~dp0ai_engine\weights\weapon_rfdetr_best.pt" set "WD_HAVE_WEIGHTS=1"
if "%WD_HAVE_WEIGHTS%"=="0" (
  echo  ERROR: Weapon model weights not installed.
  echo  Place checkpoint_best_total.pth in weapon-sidecar\models ^(ships in the pack^).
  echo  Air-gap: no download. See Installation Guide, Weapon models.
  pause
  exit /b 1
)

echo  Starting Weapon engine on 127.0.0.1:8769 ...
echo  Prefers Colab B weights if present (ai_engine\weights\weapon_rfdetr_best.pt)
echo  Fallback: pistol smoke A, then Threat. Leave THIS window open.
echo.

cd /d "%~dp0weapon-sidecar"
"%WD_PY%" -m uvicorn app:app --host 127.0.0.1 --port 8769
set "EC=%ERRORLEVEL%"
if not "%EC%"=="0" (
  echo.
  echo  Could not start Weapon sidecar. Close any other Weapon window and try again.
  pause
  exit /b %EC%
)
