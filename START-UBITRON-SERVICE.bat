@echo off
title Ubitron C2 — start service
net start UbitronC2
if errorlevel 1 (
  echo.
  echo  Failed. Run as Administrator or install first: INSTALL-UBITRON-SERVICE.ps1
  pause
  exit /b 1
)
echo  Ubitron C2 service started.
pause
