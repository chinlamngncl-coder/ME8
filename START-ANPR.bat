@echo off
title Ubitron — Start ANPR (FastALPR)
cd /d "%~dp0"

echo.
echo  Mobility Axiom — ANPR sidecar (FastALPR ship default)
echo  Folder: %~dp0anpr-sidecar
echo  Leave THIS window open while using Analytics - ANPR.
echo.

where py >nul 2>&1
if errorlevel 1 (
  where python >nul 2>&1
  if errorlevel 1 (
    echo  ERROR: Python 3 is not installed or not on PATH.
    pause
    exit /b 1
  )
)

set "ANPR_PY=%~dp0anpr-sidecar\.venv\Scripts\python.exe"
set "NEED_INSTALL=0"

if not exist "%ANPR_PY%" set "NEED_INSTALL=1"
if "%NEED_INSTALL%"=="0" (
  "%ANPR_PY%" -c "import uvicorn,cv2,fast_alpr" >nul 2>&1
  if errorlevel 1 set "NEED_INSTALL=1"
)

if "%NEED_INSTALL%"=="1" (
  echo  First-time setup — installing ANPR packages...
  echo  This can take several minutes. Leave this window open.
  echo.
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0anpr-sidecar\INSTALL.ps1"
  if errorlevel 1 (
    echo  Install failed.
    pause
    exit /b 1
  )
)

echo  Starting ANPR on 127.0.0.1:8768 ...
echo  Live/BWC:  FastALPR + cct-s-v2-global ^| best-plate crop track
echo  Heavy/CCTV: FastALPR + HyperLPR ^| pad 8-12%% ^| enhance-skip when sharp
echo  Temporal: char-majority ^(min 2^) ^| Det: CCPD YOLO Pose
echo.

REM Path-routed OCR — PP-OCR purged
if not defined FM_ANPR_ENGINE set "FM_ANPR_ENGINE=fastalpr"
if not defined FM_ANPR_ENGINE_B set "FM_ANPR_ENGINE_B=hyperlpr3"
if not defined FM_ANPR_DUAL_ENGINE set "FM_ANPR_DUAL_ENGINE=1"
if not defined FM_ANPR_MICRO_BLUR_LIVE set "FM_ANPR_MICRO_BLUR_LIVE=35"
if not defined FM_ANPR_MICRO_BLUR_FLOOR set "FM_ANPR_MICRO_BLUR_FLOOR=35"
if not defined FM_ANPR_MICRO_BLUR_HEAVY set "FM_ANPR_MICRO_BLUR_HEAVY=100"
if not defined FM_ANPR_CONF_FLOOR set "FM_ANPR_CONF_FLOOR=0.50"
if not defined FM_ANPR_LIVE_CONF_FLOOR set "FM_ANPR_LIVE_CONF_FLOOR=0.50"
if not defined FM_ANPR_OCR_CONF_FLOOR set "FM_ANPR_OCR_CONF_FLOOR=0.50"
if not defined FM_ANPR_DUAL_CONF set "FM_ANPR_DUAL_CONF=0.50"
if not defined FM_ANPR_STRICT_REGEX set "FM_ANPR_STRICT_REGEX=0"
if not defined FM_ANPR_OCR_TIMEOUT_S set "FM_ANPR_OCR_TIMEOUT_S=2.5"
if not defined FM_ANPR_FASTALPR_DET set "FM_ANPR_FASTALPR_DET=yolo-v9-t-512-license-plate-end2end"
if not defined FM_ANPR_FASTALPR_DET_CONF set "FM_ANPR_FASTALPR_DET_CONF=0.18"
if not defined FM_ANPR_FASTALPR_OCR set "FM_ANPR_FASTALPR_OCR=cct-s-v2-global-model"
if not defined FM_ANPR_TEMPORAL_MIN_LOCK set "FM_ANPR_TEMPORAL_MIN_LOCK=2"
if not defined FM_ANPR_TEMPORAL_N set "FM_ANPR_TEMPORAL_N=3"
if not defined FM_ANPR_BOX_PAD set "FM_ANPR_BOX_PAD=0.10"
if not defined FM_ANPR_PLATE_RANK_K set "FM_ANPR_PLATE_RANK_K=3"
if not defined FM_ANPR_ENHANCE_SKIP_FM set "FM_ANPR_ENHANCE_SKIP_FM=80"

cd /d "%~dp0anpr-sidecar"
"%ANPR_PY%" -m uvicorn app:app --host 127.0.0.1 --port 8768
set "EC=%ERRORLEVEL%"
if not "%EC%"=="0" (
  echo.
  echo  Could not start ANPR. Close any other ANPR window and try again.
  pause
  exit /b %EC%
)
