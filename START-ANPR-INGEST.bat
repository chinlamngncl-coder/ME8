@echo off
title Ubitron — ANPR ingest (external)
cd /d "%~dp0"

echo.
echo  Mobility Axiom — ANPR live ingest (separate from Fleet server)
echo  Keeps plate grab/OCR off the main server process.
echo  Leave THIS window open while using Analytics - ANPR Live.
echo  Also keep START-ANPR.bat (Python sidecar) running.
echo.

if not defined FM_ANPR_FLEET_URL set "FM_ANPR_FLEET_URL=http://127.0.0.1:3888"
set "FM_ANPR_INGEST_WORKER=1"

where node >nul 2>&1
if errorlevel 1 (
  echo  ERROR: Node.js not on PATH.
  pause
  exit /b 1
)

echo  Fleet URL: %FM_ANPR_FLEET_URL%
echo  Starting lib\anprIngestServiceMain.js ...
echo.

node "%~dp0lib\anprIngestServiceMain.js"
set "EC=%ERRORLEVEL%"
if not "%EC%"=="0" (
  echo.
  echo  ANPR ingest exited. Is Fleet running on %FM_ANPR_FLEET_URL% ?
  pause
  exit /b %EC%
)
