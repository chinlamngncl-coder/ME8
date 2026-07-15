@echo off
REM mob-wvp-zlm-lab-bringup — start ZLM + WVP-Pro lab
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\START-WVP-LAB.ps1"
pause
