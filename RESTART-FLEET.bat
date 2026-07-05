@echo off

title Mobility C2 Server

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



echo  Stopping old server...

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0kill-fleet-ports.ps1"

echo  Starting ZLM sidecar (if configured)...

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\me8-ship\Start-Me8ZlmSidecar.ps1" -AppRoot "%~dp0"

echo.

echo  Starting server - leave THIS window open

echo  Dashboard: http://localhost:3988

echo  Log file:   storage\fleet.log  (or VIEW-LOG.bat)

echo.



node server.js



echo.

echo  Server stopped.

pause


