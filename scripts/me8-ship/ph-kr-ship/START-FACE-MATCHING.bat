@echo off
title Ubitron — Face matching (leave this window open)
cd /d "%~dp0Ubitron-ME8"
if not exist fr-sidecar\app.py (
  echo ERROR: Face recognition components missing from Ubitron-ME8 folder.
  pause
  exit /b 1
)
call "%~dp0Ubitron-ME8\START-FR.bat"
