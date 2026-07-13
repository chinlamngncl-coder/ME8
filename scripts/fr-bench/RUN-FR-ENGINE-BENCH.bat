@echo off
title Ubitron — FR engine bench harness
cd /d "%~dp0..\.."

set "PY=%CD%\fr-sidecar\.venv\Scripts\python.exe"
if not exist "%PY%" (
  echo  ERROR: fr-sidecar\.venv missing. Run START-FR.bat once to install packages.
  pause
  exit /b 1
)

echo.
echo  FR engine bench — DeepFace baseline + optional ONNX
echo  Put images under bench\fr\  (see bench\fr\README.md)
echo.

"%PY%" "%~dp0run_fr_engine_bench.py" %*
set "EC=%ERRORLEVEL%"
echo.
if not "%EC%"=="0" (
  echo  Bench failed ^(exit %EC%^).
) else (
  echo  Done. See bench\fr\out\
)
pause
exit /b %EC%
