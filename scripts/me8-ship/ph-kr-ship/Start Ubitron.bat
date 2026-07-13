@echo off
setlocal
cd /d "%~dp0Ubitron-ME8"
if not exist run.js (
  echo ERROR: Ubitron-ME8 delivery folder not found.
  pause
  exit /b 1
)

set "NODE_EXE=%~dp0Ubitron-ME8\tools\node\node.exe"
if not exist "%NODE_EXE%" (
  echo ERROR: Bundled Node missing from pack.
  pause
  exit /b 1
)

if not exist node_modules\dotenv (
  echo.
  echo ERROR: Run Install-Ubitron.bat once first.
  echo.
  pause
  exit /b 1
)

echo Starting LiveKit...
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\START-LIVEKIT.ps1

echo Starting Ubitron Mobility Axiom...
start "Ubitron ME8 Server" cmd /k "%~dp0Ubitron-ME8\RESTART-FLEET.bat"

timeout /t 4 /nobreak >nul

REM Prefer HOST from .env; never open WSL/Docker 172.17-172.31 — use real Wi-Fi/Ethernet instead.
for /f "usebackq delims=" %%U in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$root='%~dp0'; $h='127.0.0.1'; Set-Location (Join-Path $root 'Ubitron-ME8'); if (Test-Path '.env') { foreach ($line in Get-Content '.env') { if ($line -match '^HOST=(.+)$') { $h=$Matches[1].Trim(); break } } }; $bad = ($h -match '^172\.(1[7-9]|2[0-9]|3[0-1])\.') -or ($h -eq '203.0.113.10') -or ($h -eq '127.0.0.1') -or ($h -eq 'localhost'); if ($bad) { $ip = & (Join-Path $root 'Get-UbitronPreferredLanIPv4.ps1') -Print; if ($ip) { $h=$ip } else { $h='127.0.0.1' } }; $p=3988; if (Test-Path '.env') { foreach ($line in Get-Content '.env') { if ($line -match '^FM_HTTP_PORT=(.+)$') { $p=$Matches[1].Trim(); break } } }; Write-Output ('http://{0}:{1}/' -f $h,$p)"`) do set OPEN_URL=%%U

if not defined OPEN_URL set OPEN_URL=http://127.0.0.1:3988/
start "" "%OPEN_URL%"

echo Browser opened: %OPEN_URL%
echo Use Wi-Fi / Ethernet IP (example 192.168.x.x) — never WSL 172.x for cameras or PTT.
echo Login: global / global123
exit /b 0
