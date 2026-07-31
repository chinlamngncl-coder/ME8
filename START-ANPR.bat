@echo off
title Ubitron — Start ANPR (FastALPR)
cd /d "%~dp0"

echo.
echo  Mobility Axiom — ANPR sidecar (FastALPR ship default)
echo  Folder: %~dp0anpr-sidecar
echo  Leave THIS window open while using Analytics - ANPR.
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

set "ANPR_PY=%~dp0anpr-sidecar\.venv\Scripts\python.exe"
set "NEED_INSTALL=0"

if not exist "%ANPR_PY%" set "NEED_INSTALL=1"
if "%NEED_INSTALL%"=="0" (
  "%ANPR_PY%" -c "import uvicorn,cv2,fast_alpr" >nul 2>&1
  if errorlevel 1 set "NEED_INSTALL=1"
)

if "%NEED_INSTALL%"=="1" (
  echo  First-time setup — installing ANPR packages...
  echo  This can take several minutes. Leave this window open.
  echo.
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0anpr-sidecar\INSTALL.ps1"
  if errorlevel 1 (
    echo  Install failed.
    pause
    exit /b 1
  )
)

echo  Starting ANPR on 127.0.0.1:8768 ...
echo  Ship engine: FastALPR  (lab hatch: set FM_ANPR_ENGINE=paddle)
echo.

REM ANPR-FASTALPR-SHIP-DEFAULT-V1 + ANPR-LIVE-POWER-CROP-MIT-V1
if not defined FM_ANPR_ENGINE set "FM_ANPR_ENGINE=fastalpr"
if not defined FM_ANPR_FASTALPR_DET set "FM_ANPR_FASTALPR_DET=yolo-v9-t-512-license-plate-end2end"
if not defined FM_ANPR_FASTALPR_DET_CONF set "FM_ANPR_FASTALPR_DET_CONF=0.18"

cd /d "%~dp0anpr-sidecar"
"%ANPR_PY%" -m uvicorn app:app --host 127.0.0.1 --port 8768
set "EC=%ERRORLEVEL%"
if not "%EC%"=="0" (
  echo.
  echo  Could not start ANPR. Close any other ANPR window and try again.
  pause
  exit /b %EC%
)
