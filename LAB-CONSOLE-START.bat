@echo off
title Mobility Axiom — Lab console (stop service first)
REM mob-service-lab-bat: one click — stop Windows service, then lab console Start
REM Do NOT run as Admin for the whole script if possible; only the service stop may ask for Admin.

cd /d "%~dp0"

echo.
echo  LAB CONSOLE START
echo  1) Stop Windows service UbitronC2 (may ask for Administrator)
echo  2) Start lab console (RESTART-FLEET)
echo  Do not use Test 2 on this PC at the same time.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$svc = Get-Service -Name 'UbitronC2' -ErrorAction SilentlyContinue; ^
   if (-not $svc) { Write-Host '  No UbitronC2 service installed — OK for console lab.'; exit 0 }; ^
   if ($svc.Status -ne 'Running') { Write-Host '  Service already stopped.'; exit 0 }; ^
   Write-Host '  Stopping UbitronC2 (Administrator prompt may appear)...'; ^
   try { Stop-Service -Name 'UbitronC2' -Force -ErrorAction Stop; Start-Sleep -Seconds 2; Write-Host '  Service stopped.'; exit 0 } catch { }; ^
   Start-Process -FilePath 'net.exe' -ArgumentList 'stop','UbitronC2' -Verb RunAs -Wait; ^
   Start-Sleep -Seconds 2; ^
   $s2 = Get-Service -Name 'UbitronC2' -ErrorAction SilentlyContinue; ^
   if ($s2 -and $s2.Status -eq 'Running') { Write-Host '  BLOCKED: service still running. Approve Admin stop, then run this bat again.'; pause; exit 1 }; ^
   Write-Host '  Service stopped.'"

if errorlevel 1 exit /b 1

echo.
echo  Starting lab console...
call "%~dp0RESTART-FLEET.bat"
