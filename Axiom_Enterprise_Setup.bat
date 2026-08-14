@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Mobility Axiom — Enterprise Setup
cd /d "%~dp0"

echo.
echo  ========================================================
echo   Mobility Axiom  —  Enterprise one-click setup (CN)
echo  ========================================================
echo.

set "HOST_IP=127.0.0.1"
set /p "HOST_IP=Please enter your Server IP (LAN or WAN) [Press Enter for 127.0.0.1]: "
if "!HOST_IP!"=="" set "HOST_IP=127.0.0.1"

echo !HOST_IP! | findstr /R "^172\.1[7-9]\. ^172\.2[0-9]\. ^172\.3[0-1]\." >nul
if not errorlevel 1 (
  echo.
  echo  ERROR: !HOST_IP! looks like a Docker/WSL address. Use real Wi-Fi/Ethernet IP.
  pause
  exit /b 1
)

if not exist "ship-build\storage\license.lic" (
  echo  ERROR: ship-build\storage\license.lic missing — incomplete pack.
  pause
  exit /b 1
)
if not exist "ship-build\vendor\ffmpeg-lgpl\ffmpeg.exe" (
  echo  ERROR: ship-build\vendor\ffmpeg-lgpl\ffmpeg.exe missing — incomplete pack.
  pause
  exit /b 1
)

echo.
echo  [1/4] Writing server IP !HOST_IP! into runtime .env ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Set-DeployHostEnv.ps1" -HostIp "!HOST_IP!" -EnvFile "%~dp0ship-build\protected\.env" -AlsoCopyTo "%~dp0.env"
if errorlevel 1 (
  echo  ERROR: failed to write .env
  pause
  exit /b 1
)
if exist "%~dp0.env.deploy.example" copy /Y "%~dp0.env.deploy.example" "%~dp0ship-build\protected\.env.deploy.example" >nul

echo  [2/4] Loading bundled Docker images (offline) ...
where docker >nul 2>&1
if errorlevel 1 (
  echo  WARN: docker not found on PATH — install Docker Desktop, then re-run Setup.
) else (
  if exist "%~dp0vendor\docker-images\*.tar" (
    for %%F in ("%~dp0vendor\docker-images\*.tar") do (
      echo    docker load -i "%%~nxF"
      docker load -i "%%~fF"
    )
  ) else (
    echo  WARN: vendor\docker-images\*.tar not found — compose may pull from network.
  )
)

echo  [3/4] Starting Docker services (Valkey / Postgres / WVP / ZLM) ...
where docker >nul 2>&1
if not errorlevel 1 (
  docker compose --env-file "%~dp0.env" -f docker\docker-compose.enterprise.yml up -d
  docker compose --env-file "%~dp0.env" -p me8-wvp -f docker\wvp\docker-compose.wvp.yml up -d
)

set "NODE_EXE=node"
if exist "%~dp0tools\node\node.exe" set "NODE_EXE=%~dp0tools\node\node.exe"

echo  [4/4] Starting Mobility Axiom ...
if exist "ship-build\protected\run.js" (
  start "Mobility Axiom" cmd /k "cd /d ""%~dp0"" && set FM_AIRGAP_LICENSE_REQUIRED=1&& set HOST=!HOST_IP!&& ""!NODE_EXE!"" ship-build\protected\run.js"
) else if exist "run.js" (
  start "Mobility Axiom" cmd /k "cd /d ""%~dp0"" && set FM_AIRGAP_LICENSE_REQUIRED=1&& set HOST=!HOST_IP!&& ""!NODE_EXE!"" run.js"
) else (
  echo  ERROR: No ship-build\protected\run.js found.
  pause
  exit /b 1
)

echo.
echo  ========================================================
echo   Mobility Axiom starting at http://!HOST_IP!:3888
echo   Keep the black server window open.
echo  ========================================================
echo.
pause
endlocal
