@echo off
title Mobility Axiom — Production install
setlocal EnableExtensions
cd /d "%~dp0"

set "SCRIPT_DIR=%~dp0"
set "APP_ROOT=%SCRIPT_DIR%..\.."
if exist "%SCRIPT_DIR%me8-server.exe" set "APP_ROOT=%SCRIPT_DIR%"
if exist "%SCRIPT_DIR%..\me8-server.exe" set "APP_ROOT=%SCRIPT_DIR%.."

if not exist "%APP_ROOT%\server.js" if not exist "%APP_ROOT%\me8-server.exe" (
  echo ERROR: Mobility Axiom app root not found ^(expected server.js or me8-server.exe^).
  echo Run from: scripts\me8-ship\Install-MobilityAxiom-Production.bat
  pause
  exit /b 1
)

set "SVC_PS1=%SCRIPT_DIR%Install-UbitronC2-Service.ps1"
if not exist "%SVC_PS1%" (
  echo ERROR: Install-UbitronC2-Service.ps1 missing beside this installer.
  pause
  exit /b 1
)

echo.
echo  ============================================================
echo   Mobility Axiom — production install ^(headless service^)
echo  ============================================================
echo.
echo  App folder: %APP_ROOT%
echo.
echo  NEXT: press any key, then click YES on the Windows Administrator prompt.
echo  Registers UbitronC2 ^(NSSM^), auto-start, logs to storage\ — no console windows.
echo.
pause

echo.
echo  Installing UbitronC2 Windows Service...
echo.

if exist "%APP_ROOT%\me8-server.exe" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell.exe -Verb RunAs -Wait -WorkingDirectory '%APP_ROOT%' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File','%SVC_PS1%','-AppRoot','%APP_ROOT%','-Use1Pack','-PauseAtEnd')"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell.exe -Verb RunAs -Wait -WorkingDirectory '%APP_ROOT%' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File','%SVC_PS1%','-AppRoot','%APP_ROOT%','-PauseAtEnd')"
)

if errorlevel 1 (
  echo.
  echo  Service install did not complete. Run as Administrator or contact Ubitron support.
  pause
  exit /b 1
)

echo.
echo  Install complete. Open: http://localhost:3988
echo  Change the factory password after first login.
echo.
pause
exit /b 0
