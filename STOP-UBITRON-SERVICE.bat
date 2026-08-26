@echo off
title Mobility Axiom â€” stop service
net stop UbitronC2
if errorlevel 1 (
  echo.
  echo  Failed. Run as Administrator.
  pause
  exit /b 1
)
echo  Mobility Axiom service stopped.
pause
