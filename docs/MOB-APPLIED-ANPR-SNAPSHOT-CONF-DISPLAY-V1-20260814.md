# MOB-APPLIED ANPR-SNAPSHOT-CONF-DISPLAY-V1 — 2026-08-14

**APPLY:** `ANPR-SNAPSHOT-CONF-DISPLAY-V1`  
**Disc:** `docs/MOB-DISC-ANPR-SNAPSHOT-PASS-CONF1-THREE-PROCESS-20260814.md`

## Cause

RapidOCR / cascade often returns confidence in **0–1**. Snapshot UI appended `%` without scaling → e.g. `1.0` → **“Confidence: 1%”**.

## Fix

1. `anpr-sidecar/app.py` — `/read` emits `confidence` as **0–100**.
2. `public/js/analytics-hub.js` — display accepts 0–1 or 0–100; shows integer percent.
3. Cache bust `analytics-hub.js?v=20260814-anpr-conf-display-v1`.

## Operator

Restart ANPR bat + hard-refresh → Snapshot Read plate → expect ~real % (e.g. 80–99), not 1%.
