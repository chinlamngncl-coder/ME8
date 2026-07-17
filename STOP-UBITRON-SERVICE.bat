@echo off
title Ubitron C2 — stop service
net stop UbitronC2
if errorlevel 1 (
  echo.
  echo  Failed. Run as Administrator.
  pause
  exit /b 1
)
echo  Ubitron C2 service stopped.
pause
