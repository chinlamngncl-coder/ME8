@echo off
REM mob-fr-seeta-windows-lab-proof — start Seeta lab sidecar on :8767
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Run INSTALL-SEETA-LAB.ps1 first.
  pause
  exit /b 1
)
echo Starting Seeta lab on 127.0.0.1:8767 ...
".venv\Scripts\python.exe" -m uvicorn app:app --host 127.0.0.1 --port 8767
pause
