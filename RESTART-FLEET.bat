@echo off
title Mobility C2 Server — LAB console mode
REM Enterprise / customer: use INSTALL-UBITRON-SERVICE.ps1 (Windows service, no window).
REM RESTART-FLEET.bat is for lab, support, and first smoke only.
REM mob-start-safe: do not start if ports/service still busy after stop attempt.

cd /d "%~dp0"

echo.
echo  RESTART Mobility C2
echo  Folder: %~dp0
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js not found. Install Node or use a terminal where "node" works.
    pause
    exit /b 1
)

echo  Stopping old server / checking ports are free...
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
echo  Starting server - leave THIS window open
echo  Dashboard: http://localhost:3988
echo  Log file:   storage\fleet.log  (or VIEW-LOG.bat)
echo.

node server.js

echo.
echo  Server stopped.
pause
