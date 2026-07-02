@echo off
title Mobility Axiom Server
cd /d "%~dp0"

set "NODE_EXE=%~dp0tools\node\node.exe"
if not exist "%NODE_EXE%" (
    echo  ERROR: Bundled Node missing — use a complete trial delivery pack.
    pause
    exit /b 1
)

if not exist run.js (
    echo  ERROR: run.js missing — use the delivery pack, not a dev tree.
    pause
    exit /b 1
)

if not exist node_modules\dotenv (
    echo  ERROR: Run Install-Mobility.bat once first.
    pause
    exit /b 1
)

echo.
echo  RESTART Mobility Axiom
echo  Folder: %~dp0
echo.

echo  Stopping old server...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0kill-fleet-ports.ps1"
echo.
echo  Starting server — leave THIS window open
echo  Dashboard: http://localhost:3888
echo.

"%NODE_EXE%" run.js

echo.
echo  Server stopped.
pause
