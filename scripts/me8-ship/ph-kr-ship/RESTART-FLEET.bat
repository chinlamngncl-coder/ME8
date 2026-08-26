@echo off
title Ubitron Mobility Axiom Server
cd /d "%~dp0"

if not exist me8-server.exe (
    echo  ERROR: me8-server.exe missing — use the delivery pack.
    pause
    exit /b 1
)

echo.
echo  RESTART Ubitron Mobility Axiom
echo  Folder: %~dp0
echo.

echo  Stopping old server...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0kill-fleet-ports.ps1"
echo.
echo  Starting server — leave THIS window open
echo  Dashboard: http://localhost:3988
echo.

me8-server.exe

echo.
echo  Server stopped.
pause
