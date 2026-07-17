# MOB APPLIED — `mob-sec-fleetlog-safe-console`

**Date:** 2026-07-15 ~02:34  
**Apply:** `MOB-APPLY mob-sec-fleetlog-safe-console`  
**Scope:** `lib/fleetLog.js` only.

---

## Change

Hardened `fleetLog.emit()` so broken stdout/stderr does not crash Fleet logging:

- ring buffer still receives the line;
- `storage/fleet.log` append happens before console output;
- `console.log(line)` is wrapped;
- `EPIPE` from console write is ignored;
- non-EPIPE console failures use guarded `process.stderr.write(...)`.

This complements `mob-sec-epipe-log-guard`.

---

## Not Changed

- Fatal exception restart policy.
- ZLM/WVP/media behavior.
- Wall/PTT/SIP.

---

## Verification

- `node --check lib/fleetLog.js` passed.
- `node --check server.js` passed.

Restart Fleet for runtime effect.
