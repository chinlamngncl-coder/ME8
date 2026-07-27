@echo off
title ME8 1-Pack — Safe Mode (Setup UI)
cd /d "%~dp0"

echo.
echo  ME8 SAFE MODE — Setup UI only (no full video/DB stack)
echo  Lab dashboard can keep running on :3988
echo  Setup opens on http://127.0.0.1:13988
echo.
echo  Leave this window open. Close it to stop Setup.
echo.

REM Force free ports so we never fight FM_HTTP_PORT=3988
set SETUP_PORT=13988
set SETUP_HTTPS_PORT=13989

start "" "http://127.0.0.1:13988/"
node bin\me8-server.js --safe-mode
echo.
echo  Setup stopped.
pause
