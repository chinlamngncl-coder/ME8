@echo off
setlocal
cd /d "%~dp0Mobility-Axiom"
if not exist run.js (
  echo ERROR: Mobility-Axiom delivery folder not found.
  pause
  exit /b 1
)

set "NODE_EXE=%~dp0Mobility-Axiom\tools\node\node.exe"
if not exist "%NODE_EXE%" (
  echo ERROR: Bundled Node missing from pack.
  pause
  exit /b 1
)

if not exist node_modules\dotenv (
  echo.
  echo ERROR: Run Install-Mobility.bat once first.
  echo.
  pause
  exit /b 1
)

echo Starting LiveKit...
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\START-LIVEKIT.ps1

echo Starting Mobility Axiom...
start "Mobility Axiom Server" cmd /k "%~dp0Mobility-Axiom\RESTART-FLEET.bat"

timeout /t 4 /nobreak >nul

for /f "usebackq delims=" %%U in (`powershell -NoProfile -Command "$h='127.0.0.1'; if (Test-Path '.env') { foreach ($line in Get-Content '.env') { if ($line -match '^HOST=(.+)$') { $h=$Matches[1].Trim(); break } } }; if ($h -eq '203.0.113.10' -or $h -eq '127.0.0.1' -or $h -eq 'localhost') { $ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1).IPAddress; if ($ip) { $h=$ip } }; $p=3888; if (Test-Path '.env') { foreach ($line in Get-Content '.env') { if ($line -match '^FM_HTTP_PORT=(.+)$') { $p=$Matches[1].Trim(); break } } }; Write-Output ('http://{0}:{1}/' -f $h,$p)"`) do set OPEN_URL=%%U

if not defined OPEN_URL set OPEN_URL=http://127.0.0.1:3888/
start "" "%OPEN_URL%"

echo Browser opened: %OPEN_URL%
echo Login: global / global123
exit /b 0
