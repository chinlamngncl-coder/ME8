@echo off
title Ubitron — Start face recognition
cd /d "%~dp0"

echo.
echo  Face recognition service (demo / server)
echo  Folder: %~dp0fr-sidecar
echo.

where py >nul 2>&1
if errorlevel 1 (
  where python >nul 2>&1
  if errorlevel 1 (
    echo  ERROR: Python 3 is not installed or not on PATH.
    echo  Install Python 3.11+ then run this again.
    pause
    exit /b 1
  )
)

set "FR_PY=%~dp0fr-sidecar\.venv\Scripts\python.exe"
set "NEED_INSTALL=0"

if not exist "%FR_PY%" set "NEED_INSTALL=1"
if "%NEED_INSTALL%"=="0" (
  "%FR_PY%" -c "import uvicorn" >nul 2>&1
  if errorlevel 1 set "NEED_INSTALL=1"
)

if "%NEED_INSTALL%"=="1" (
  echo  First-time setup — installing face matching packages...
  echo  This can take several minutes. Leave this window open.
  echo.
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0fr-sidecar\INSTALL.ps1"
  if errorlevel 1 (
    echo  Install failed.
    pause
    exit /b 1
  )
  if not exist "%FR_PY%" (
    echo  Install finished but Python environment is missing.
    pause
    exit /b 1
  )
  "%FR_PY%" -c "import uvicorn" >nul 2>&1
  if errorlevel 1 (
    echo  Install finished but face matching packages are incomplete.
    echo  Run START-FR.bat again, or ask your administrator.
    pause
    exit /b 1
  )
)

echo  Starting face matching...
echo  Leave THIS window open while you use Analytics - Verify.
echo  Then hard-refresh the dashboard.
echo.

cd /d "%~dp0fr-sidecar"
"%FR_PY%" -m uvicorn app:app --host 127.0.0.1 --port 8765
set "EC=%ERRORLEVEL%"
if not "%EC%"=="0" (
  echo.
  echo  Could not start face matching. Close any other face-matching window and try again.
  pause
  exit /b %EC%
)
