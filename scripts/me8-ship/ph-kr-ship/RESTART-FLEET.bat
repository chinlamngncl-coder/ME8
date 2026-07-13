@echo off
title Ubitron Mobility C2 Server
cd /d "%~dp0"

set "NODE_EXE=%~dp0tools\node\node.exe"
if not exist "%NODE_EXE%" (
    echo  ERROR: Bundled Node missing — use a complete delivery pack.
    pause
    exit /b 1
)

if not exist run.js (
    echo  ERROR: run.js missing — use the delivery pack, not a dev tree.
    pause
    exit /b 1
)

if not exist node_modules\dotenv (
    echo  ERROR: Run Install-Ubitron.bat once first.
    pause
    exit /b 1
)

echo.
echo  RESTART Ubitron Mobility C2
echo  Folder: %~dp0
echo.

echo  Stopping old server...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0kill-fleet-ports.ps1"
echo.
echo  Starting server — leave THIS window open
echo  Dashboard: http://localhost:3988
echo.

"%NODE_EXE%" run.js

echo.
echo  Server stopped.
pause
