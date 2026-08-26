@echo off
title Mobility Axiom â€” start service
net start UbitronC2
if errorlevel 1 (
  echo.
  echo  Failed. Run as Administrator or install first: INSTALL-UBITRON-SERVICE.ps1
  pause
  exit /b 1
)
echo  Mobility Axiom service started.
pause
