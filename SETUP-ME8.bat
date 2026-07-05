@echo off
title Ubitron ME8
cd /d "%~dp0"

echo.
echo  Ubitron ME8
echo  Folder: %~dp0
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js is not installed on this server.
    echo  Contact Ubitron support — do not run developer tools on this folder.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo  ERROR: This pack is incomplete — contact Ubitron support for a full delivery pack.
    pause
    exit /b 1
)

call "%~dp0RESTART-FLEET.bat"
