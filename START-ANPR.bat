@echo off
REM LAB USE ONLY. In production, server.js automatically spawns these AI engines invisibly.
title Ubitron — Start ANPR (RapidOCR)
cd /d "%~dp0"

if exist "%~dp0bin\anpr-engine.exe" (
  echo Starting compiled ANPR engine...
  "%~dp0bin\anpr-engine.exe"
  goto :eof
)

echo.
echo  Mobility Axiom — ANPR sidecar (RapidOCR ONNX + YOLO plate bbox)
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
  "%ANPR_PY%" -c "import uvicorn,cv2" >nul 2>&1
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

REM AIRGAP-SIDECAR-NO-DOWNLOAD-V1 — no runtime pip. ultralytics must already be in the venv
REM (INSTALL.ps1 / shipped venv). Missing = readable stop, not a network call.
"%ANPR_PY%" -c "import ultralytics" >nul 2>&1
if errorlevel 1 (
  echo  ERROR: ultralytics is not installed in anpr-sidecar\.venv — Stage 2 cannot start.
  echo  Air-gap: no download. Re-run anpr-sidecar\INSTALL.ps1 with the offline wheel pack
  echo  ^(see Installation Guide, ANPR^).
  pause
  exit /b 1
)

echo  Starting ANPR on 127.0.0.1:8768 ...
echo  Live/BWC:  RapidOCR (ONNX) on YOLO plate bbox crop
echo  Native ingest: Python cv2.VideoCapture ^(Node sends stream URL only^)
echo  Filters: Laplacian blur ^>=35 ^| plate text dedupe 10s
echo.
echo  Do NOT need START-ANPR-INGEST.bat when FM_ANPR_NATIVE_INGEST=1 ^(default^).
echo.
REM Live OCR = RapidOCR onnxruntime (no paddlepaddle / no shm.dll).
if not defined FM_ANPR_NATIVE_INGEST set "FM_ANPR_NATIVE_INGEST=1"
if not defined FM_ANPR_ENGINE set "FM_ANPR_ENGINE=rapidocr"
if not defined FM_ANPR_ENGINE_B set "FM_ANPR_ENGINE_B=hyperlpr3"
if not defined FM_ANPR_DUAL_ENGINE set "FM_ANPR_DUAL_ENGINE=1"
if not defined FM_ANPR_PLATE_DET set "FM_ANPR_PLATE_DET=ph_id_yolo"
if not defined FM_ANPR_STAGE2_CONF set "FM_ANPR_STAGE2_CONF=0.05"
if not defined FM_ANPR_CCPD_POSE_CONF set "FM_ANPR_CCPD_POSE_CONF=0.05"
if not defined FM_ANPR_STAGE2_FORCE_RGB set "FM_ANPR_STAGE2_FORCE_RGB=1"
if not defined FM_ANPR_STAGE2_PREFER_CROP set "FM_ANPR_STAGE2_PREFER_CROP=0"
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
if not defined FM_ANPR_BOX_PAD set "FM_ANPR_BOX_PAD=0.30"
if not defined FM_ANPR_PLATE_RANK_K set "FM_ANPR_PLATE_RANK_K=3"
if not defined FM_ANPR_ENHANCE_SKIP_FM set "FM_ANPR_ENHANCE_SKIP_FM=80"

REM Anti-deadlock before Python loads OpenCV / ONNX (RapidOCR hang)
set "OMP_NUM_THREADS=1"
set "OPENBLAS_NUM_THREADS=1"
set "MKL_NUM_THREADS=1"

cd /d "%~dp0anpr-sidecar"
"%ANPR_PY%" -m uvicorn app:app --host 127.0.0.1 --port 8768
set "EC=%ERRORLEVEL%"
if not "%EC%"=="0" (
  echo.
  echo  Could not start ANPR. Close any other ANPR window and try again.
  pause
  exit /b %EC%
)
