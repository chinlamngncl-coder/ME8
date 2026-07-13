@echo off
setlocal
cd /d "%~dp0Ubitron-ME8"
if not exist run.js (
  echo ERROR: Ubitron-ME8 delivery folder not found or incomplete.
  pause
  exit /b 1
)

set "NODE_EXE=%~dp0Ubitron-ME8\tools\node\node.exe"
if not exist "%NODE_EXE%" (
  echo ERROR: Bundled Node runtime missing from this pack.
  echo Re-download the delivery pack or contact your vendor.
  pause
  exit /b 1
)

echo.
echo === Ubitron Mobility C2 — Installation ===
echo Node.js is included in this pack — do not install Node separately.
echo.

where docker >nul 2>&1
if errorlevel 1 (
  echo Docker Desktop is required for Video Conference.
  echo Download: https://www.docker.com/products/docker-desktop/
  echo Install Docker, start it, then run this script again.
  pause
  exit /b 1
)

if not exist node_modules\dotenv (
  echo ERROR: Application libraries missing from pack.
  echo Re-download the delivery pack or contact your vendor.
  pause
  exit /b 1
)

echo [1/4] Verify bundled runtime...
"%NODE_EXE%" scripts\verify-install.js --quiet
if errorlevel 1 goto fail

if not exist .env (
  copy /Y .env.example .env >nul
  echo Created .env — detecting LAN IP for HOST...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ip = & '%~dp0Get-UbitronPreferredLanIPv4.ps1' -Print; if (-not $ip) { exit 0 }; $p='.env'; $raw = Get-Content $p -Raw; $raw = $raw -replace '(?m)^HOST=.*','HOST='+$ip; $raw = $raw -replace '(?m)^FM_GB28181_PUBLIC_HOST=.*','FM_GB28181_PUBLIC_HOST='+$ip; $raw = $raw -replace '(?m)^FM_SEED_BWC_ID=.*','FM_SEED_BWC_ID='; if ($raw -notmatch 'FM_SEED_BWC_ID=') { $raw += \"`r`nFM_SEED_BWC_ID=`r`n\" }; if ($raw -notmatch 'FM_LIVEKIT_PUBLIC_WS=') { $raw += \"`r`nFM_LIVEKIT_PUBLIC_WS=ws://$ip`:7880`r`n\" } else { $raw = $raw -replace '(?m)^FM_LIVEKIT_PUBLIC_WS=.*',\"FM_LIVEKIT_PUBLIC_WS=ws://$ip`:7880\" }; Set-Content $p $raw -Encoding UTF8"
)

echo [2/4] Start Video Conference service ^(Docker / LiveKit^)...
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\START-LIVEKIT.ps1
if errorlevel 1 (
  echo Video Conference service start failed — open Docker Desktop and try again.
  pause
  exit /b 1
)

echo [3/4] Face recognition — checking Python...
where py >nul 2>&1
if errorlevel 1 (
  where python >nul 2>&1
  if errorlevel 1 (
    echo.
    echo NOTE: Python 3.11+ is not installed yet.
    echo Face Analytics will not run until Python is installed.
    echo See manuals\ Installation-Guide in your language — Section 6.
    echo.
    goto skip_fr
  )
)
set "FR_PY=%~dp0Ubitron-ME8\fr-sidecar\.venv\Scripts\python.exe"
if not exist "%FR_PY%" (
  echo First-time face recognition setup — this may take several minutes...
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Ubitron-ME8\fr-sidecar\INSTALL.ps1"
  if errorlevel 1 (
    echo Face recognition setup failed — you can retry from START-FACE-MATCHING.bat later.
    goto skip_fr
  )
)
echo Face recognition environment ready.
:skip_fr

echo [4/4] Install complete.
echo.
echo Next: double-click "Start Ubitron.bat" in this folder
echo Login: global / global123
echo Change password after first login — see Installation-Guide.
echo.
pause
exit /b 0

:fail
echo Install failed.
pause
exit /b 1
