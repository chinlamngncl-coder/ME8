@echo off
title Ubitron — Start Weapon (RF-DETR)
cd /d "%~dp0"

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

echo  Starting Weapon engine on 127.0.0.1:8769 ...
echo  Engine: RF-DETR Threat Apache-2.0 ^| gun + knife only
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
