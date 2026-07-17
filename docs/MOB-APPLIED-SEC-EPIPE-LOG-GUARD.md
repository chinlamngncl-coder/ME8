# MOB APPLIED — `mob-sec-epipe-log-guard`

**Date:** 2026-07-15 ~02:33  
**Apply:** `MOB-APPLY mob-sec-epipe-log-guard`  
**Scope:** `server.js` top `process.on('uncaughtException')` handler only.

---

## Change

Added a narrow guard for stdout/stderr broken-pipe exceptions:

- if `err.code === 'EPIPE'` and `err.syscall === 'write'`, return immediately;
- fallback logging no longer uses `console.error`;
- fallback uses guarded `process.stderr.write(...)`.

This prevents the historical red-text loop where Fleet tries to log an `EPIPE` caused by logging itself.

---

## Not Changed

- `fleetLog.emit()` console behavior — separate `mob-sec-fleetlog-safe-console`.
- fatal-exit policy for real uncaught exceptions — separate `mob-sec-uncaught-exit`.
- ZLM / WVP / wall / PTT / SIP.

---

## Verification

`node --check server.js` passed.

Restart Fleet for runtime effect.
