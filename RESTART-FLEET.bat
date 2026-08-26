@echo off
title Mobility Axiom Server â€” restart
REM mob-lab-restart-fleet-prefer-service:
REM   If Windows service UbitronC2 is installed â†’ restart that service (UAC once if needed).
REM   If service is NOT installed â†’ old lab console mode (node server.js in this window).
REM Enterprise ship keeps the service. Lab without service still works.

cd /d "%~dp0"

echo.
echo  RESTART Mobility Axiom
echo  Folder: %~dp0
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0restart-fleet-prefer-service.ps1"
set "RF_RC=%ERRORLEVEL%"

if "%RF_RC%"=="0" (
    echo.
    echo  Service restart done. Leave service running in background.
    echo  Open dashboard URLs:
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0restart-fleet-prefer-service.ps1" -PrintUrlsOnly
    echo  This window can be closed.
    echo.
    pause
    exit /b 0
)

if "%RF_RC%"=="1" (
    echo.
    echo  START CANCELLED â€” service restart failed.
    echo  Click Yes on UAC, or Run as administrator, then try again.
    echo.
    pause
    exit /b 1
)

REM RF_RC==2 or anything else â†’ lab console path
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
    echo  START CANCELLED â€” fix the BLOCKED message above, then try again.
    echo  Do not use a half-dead dashboard on localhost:3988.
    echo.
    pause
    exit /b 1
)

echo.
echo  Starting console server - leave THIS window open
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0restart-fleet-prefer-service.ps1" -PrintUrlsOnly
echo  Log file:   storage\fleet.log  (or VIEW-LOG.bat)
echo.

node server.js

echo.
echo  Server stopped.
pause
