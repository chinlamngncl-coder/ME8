Ubitron ME8 — ZLMediaKit sidecar (internal)
==========================================

Place ZLMediaKit MediaServer binary here for Windows on-prem:

  vendor\zlm\MediaServer.exe
  vendor\zlm\config.ini        (copy from scripts\zlm\config.ini.example)

Bootstrap profile (internal):

  FM_ZLM_ENABLED=1
  FM_ZLM_BIN=vendor\zlm\MediaServer.exe
  FM_ZLM_CONFIG=vendor\zlm\config.ini
  FM_ZLM_HTTP_URL=http://127.0.0.1:8080
  FM_ZLM_SECRET=<same as [api] secret in config.ini>
  FM_LIVE_ENGINE=zlm
  FM_LIVE_FALLBACK_FFMPEG=1

Lab Docker alternative:

  docker compose -f docker/zlm.compose.yaml up -d

Verify:

  .\scripts\me8-ship\VERIFY-ZLM-SIDECAR.ps1

Operators never configure this folder.

See docs\ME8-ZLM-SIDECAR-SETUP.md
