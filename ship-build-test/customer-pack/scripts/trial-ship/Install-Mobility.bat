@echo off
setlocal
cd /d "%~dp0Mobility-Axiom"
if not exist run.js (
  echo ERROR: Mobility-Axiom delivery folder not found or incomplete.
  pause
  exit /b 1
)

set "NODE_EXE=%~dp0Mobility-Axiom\tools\node\node.exe"
if not exist "%NODE_EXE%" (
  echo ERROR: Bundled Node runtime missing from this pack.
  echo Re-download the trial pack or contact your vendor.
  pause
  exit /b 1
)

echo.
echo === Mobility Axiom Trial Install ===
echo Node.js is included in this pack - no separate Node download.
echo.

where docker >nul 2>&1
if errorlevel 1 (
  echo Docker Desktop is required for Video Conference only.
  echo Download: https://www.docker.com/products/docker-desktop/
  echo Install Docker, start it, then run this script again.
  pause
  exit /b 1
)

if not exist node_modules\dotenv (
  echo ERROR: Application libraries missing from pack.
  echo Re-download the trial pack or contact your vendor.
  pause
  exit /b 1
)

echo [1/3] Verify bundled runtime...
"%NODE_EXE%" scripts\verify-install.js --quiet
if errorlevel 1 goto fail

if not exist .env (
  copy /Y .env.example .env >nul
  echo Created .env — detecting LAN IP for HOST...
  powershell -NoProfile -Command "$ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1).IPAddress; if (-not $ip) { exit 0 }; $p='.env'; $raw = Get-Content $p -Raw; $raw = $raw -replace '(?m)^HOST=.*','HOST='+$ip; $raw = $raw -replace '(?m)^FM_GB28181_PUBLIC_HOST=.*','FM_GB28181_PUBLIC_HOST='+$ip; $raw = $raw -replace '(?m)^FM_SEED_BWC_ID=.*','FM_SEED_BWC_ID='; if ($raw -notmatch 'FM_SEED_BWC_ID=') { $raw += \"`r`nFM_SEED_BWC_ID=`r`n\" }; if ($raw -notmatch 'FM_LIVEKIT_PUBLIC_WS=') { $raw += \"`r`nFM_LIVEKIT_PUBLIC_WS=ws://$ip`:7880`r`n\" } else { $raw = $raw -replace '(?m)^FM_LIVEKIT_PUBLIC_WS=.*',\"FM_LIVEKIT_PUBLIC_WS=ws://$ip`:7880\" }; Set-Content $p $raw -Encoding UTF8"
)

echo [2/3] Start LiveKit video engine ^(Docker^)...
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\START-LIVEKIT.ps1
if errorlevel 1 (
  echo LiveKit start failed — open Docker Desktop and try again.
  pause
  exit /b 1
)

echo [3/3] Install complete.
echo.
echo Next: double-click "Start Mobility.bat" in this folder
echo Login: global / global123
echo See manuals\ folder for Quick Guide in your language.
echo.
pause
exit /b 0

:fail
echo Install failed.
pause
exit /b 1
