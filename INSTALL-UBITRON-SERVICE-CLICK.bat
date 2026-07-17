@echo off
title Install Ubitron server (one time)
cd /d "%~dp0"

echo.
echo  ============================================================
echo   Ubitron - install server to run in the background
echo  ============================================================
echo.
echo  ONE TIME only. After this you use the browser only.
echo.
echo  NEXT: press any key here.
echo  THEN: a small Windows security box appears - click YES.
echo.
echo  IF THE YES BOX IS HIDDEN:
echo    - Look at the bottom-right taskbar for a flashing shield icon
echo    - Or press Alt+Tab until you see "User Account Control"
echo    - Click Yes on that box
echo.
echo  IF YOU CANNOT GET YES TO WORK — skip install for now:
echo    Double-click START-FACE-MATCHING.bat instead (no admin needed).
echo.
pause

echo.
echo  Starting install - watch for the Windows YES box...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'powershell.exe' -Verb RunAs -Wait -WorkingDirectory '%CD%' -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','INSTALL-UBITRON-SERVICE.ps1','-PauseAtEnd'"

if errorlevel 1 (
  echo.
  echo  PLAN B - do this manually:
  echo    1. In File Explorer open this folder:
  echo       %CD%
  echo    2. Right-click INSTALL-UBITRON-SERVICE.ps1
  echo    3. Choose "Run with PowerShell" as Administrator
  echo       ^(or open PowerShell as Admin and run the .ps1^)
  echo.
)

echo.
echo  If you saw green SERVICE OK, open browser: http://localhost:3988
echo  Then close all black windows - site should still work.
echo.
pause
