@echo off
title Mobility Axiom — STOP server
cd /d "%~dp0"

echo.
echo  STOP Mobility Axiom
echo  This STOPS the server. Dashboard will show Server Connection Lost.
echo  Folder: %~dp0
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Continue';" ^
  "$svc = Get-Service -Name UbitronC2 -ErrorAction SilentlyContinue;" ^
  "if ($svc -and $svc.Status -eq 'Running') {" ^
  "  Write-Host ' Stopping Windows service UbitronC2 ...';" ^
  "  try { Stop-Service -Name UbitronC2 -Force -ErrorAction Stop; Write-Host ' Service stopped.' } catch {" ^
  "    Write-Host ' Trying elevated stop...';" ^
  "    Start-Process -FilePath net.exe -ArgumentList 'stop','UbitronC2' -Verb RunAs -Wait" ^
  "  }" ^
  "} else { Write-Host ' Service UbitronC2 not running (or not installed).' }" ^
  "Start-Sleep -Seconds 1;" ^
  "$svc2 = Get-Service -Name UbitronC2 -ErrorAction SilentlyContinue;" ^
  "if ($svc2) { Write-Host (' Service status: ' + $svc2.Status) }"

if exist "%~dp0kill-fleet-ports.ps1" (
  echo  Freeing dashboard ports...
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0kill-fleet-ports.ps1"
)

echo.
echo  DONE. Leave this window. Open dashboard — you should see Server Connection Lost.
echo  To start again: RESTART-FLEET.bat  (then login).
echo.
pause
