# MOB DISC — ANALYTICS-ENGINE-HEALTH-PLAIN-V1 APPLIED

**Date:** 2026-07-30  
**Status:** **APPLIED** — operator: open **Verify 1:1** / **ANPR** to see strings (not on Face)  
**APPLY:** `MOB-APPLY ANALYTICS-ENGINE-HEALTH-PLAIN-V1`  
**Parent disc:** `MOB-DISC-ANALYTICS-ENGINE-HEALTH-PLAIN-NO-OSS-NAMES-20260730.md`  
**Where visible:** `MOB-DISC-ANALYTICS-ENGINE-HEALTH-WHERE-VISIBLE-20260730.md`

---

## What changed

| Surface | Before | After |
|---------|--------|-------|
| Analytics → FR status (`#ax-fr-sidecar-status`) | “Face matching is ready.” / long service-down | **FR Engine — OK** / **FR Engine — Not available** / **Not licensed** |
| Analytics → ANPR status (`#ax-anpr-status`) | “Plate reading is ready.” / long service-down | **ANPR Engine — OK** / **ANPR Engine — Not available** / **Not licensed** |
| Watchlist health hint (`#ax-bl-status` when down) | Long admin ask | **FR Engine — Not available** (plain) |

- UI still uses health `runtime.ok` only — does **not** print `engine`, FastALPR, Paddle, YOLO, etc.
- Action errors (verify / read fail) keep longer “ask administrator” copy — no OSS brand names.
- Tech diagnostics unchanged (may still show engine detail).

## Files

- `public/js/analytics-hub.js` — status refresh copy
- `public/locales/en.json` — `engineOk` / `engineDown` / `engineNotLicensed` / `engineChecking`
- `public/index.html` — cache bust `analytics-hub.js?v=20260730-engine-health-plain-v1`

## Operator verify

1. Hard refresh Analytics.
2. Open **Verify 1:1** (not Face): status shows **FR Engine — OK** (or Not available / Not licensed) — no library names.
3. Open **ANPR**: status shows **ANPR Engine — OK** (or Not available / Not licensed) — no FastALPR / Paddle / YOLO.
4. **Face recognition** has no engine status line today — see `MOB-DISC-ANALYTICS-ENGINE-HEALTH-WHERE-VISIBLE-20260730.md`.

## Lock

Operator-facing Analytics engine health = plain capability labels only. No open-source project names on that chrome.
