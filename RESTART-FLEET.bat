@echo off
title Mobility C2 Server — restart
REM mob-lab-restart-fleet-prefer-service:
REM   If Windows service UbitronC2 is installed → restart that service (UAC once if needed).
REM   If service is NOT installed → old lab console mode (node server.js in this window).
REM Enterprise ship keeps the service. Lab without service still works.

cd /d "%~dp0"

echo.
echo  RESTART Mobility C2
echo  Folder: %~dp0
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0restart-fleet-prefer-service.ps1"
set "RF_RC=%ERRORLEVEL%"

if "%RF_RC%"=="0" (
    echo.
    echo  Service restart done. Leave service running in background.
    echo  Open dashboard: http://192.168.1.38:3988
    echo  This window can be closed.
    echo.
    pause
    exit /b 0
)

if "%RF_RC%"=="1" (
    echo.
    echo  START CANCELLED — service restart failed.
    echo  Click Yes on UAC, or Run as administrator, then try again.
    echo.
    pause
    exit /b 1
)

REM RF_RC==2 or anything else → lab console path
where node >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js not found. Install Node or use a terminal where "node" works.
    pause
    exit /b 1
)

echo  Stopping old console server / checking ports are free...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0kill-fleet-ports.ps1"
if errorlevel 1 (
    echo.
    echo  START CANCELLED — fix the BLOCKED message above, then try again.
    echo  Do not use a half-dead dashboard on localhost:3988.
    echo.
    pause
    exit /b 1
)

echo.
echo  Starting console server - leave THIS window open
echo  Dashboard: http://localhost:3988
echo  Log file:   storage\fleet.log  (or VIEW-LOG.bat)
echo.

node server.js

echo.
echo  Server stopped.
pause
