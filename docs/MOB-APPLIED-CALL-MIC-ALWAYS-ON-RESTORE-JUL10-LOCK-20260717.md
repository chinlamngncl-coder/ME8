# MOB APPLIED — call-mic-always-on-restore-jul10-lock

**Date:** 2026-07-17  
**APPLY:** `MOB-APPLY call-mic-always-on-restore-jul10-lock`  
**Lock:** `docs/MOB-DISC-BWC-PTT-DURING-LIVE-CALL.md` (2026-07-10) — Call = **always-on mic**; `mob-call-mic-hold` rejected forever

## What changed

| File | Action |
|------|--------|
| `public/js/call-mic.js` | Restored from `3c865d9^` (pre–FR genre hold UI). Blob `cd627e6…` — phone/always-on path, **no** Hold To Talk button |
| `public/index.html` | Cache bust `call-mic.js?v=20260717-call-mic-always-on` |

## Why

Hold To Talk was **re-smuggled** in `3c865d9` (2026-07-11 lab-fr-genre). Soft Open restores never touched `call-mic.js`. This APPLY restores the Jul-10 operator lock: press **Call** → mic streams continuously; no floating hold chrome.

## Not touched

- `ptt-mic.js` / `pttServer.js` / `ptt-rx.js` (PTT hold stays as designed)
- Soft Open wall / player / broker
- `server.js` / redact / FR
- Firmware Gold / Pre-Gate full restore

## Operator

1. Hard refresh once — prefer `http://192.168.1.38:3988` (Ctrl+F5)
2. Chin: Live → **Call**
3. Expect: **no** “Hold to talk” button; talk immediately after Call
4. End Call → mic stops
5. Optional: cold PTT still works?

Reply: Call always-on **PASS** / **FAIL** (+ BWC hear HQ yes/no if you check that).
