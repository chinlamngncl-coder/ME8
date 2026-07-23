# MOB-APPLIED — ROLLBACK GB private extensions V2 → checkpoint

**Date:** 2026-07-23  
**Status:** APPLIED  
**Apply:** `MOB-APPLY ROLLBACK-GB-PRIVATE-EXTENSIONS-V2-TO-CHECKPOINT`

## Done

- Restored working tree private-extension V2 edits to checkpoint **`ec0296d`** (`auto-backup: checkpoint before private SIP/UDP extensions`).
- Removed V2-only files:
  - `lib/privateBwcExtensions.js`
  - `scripts/verify-gb-private-extensions-killswitch.js`
- Confirmed no remaining `privateBwcExtensions` / `FM_ENABLE_PRIVATE_BWC_EXTENSIONS` / `ENABLE_PRIVATE_BWC_EXTENSIONS` in `server.js`, `lib/pttServer.js`, `package.json`, `.env.example`.

## Kept (history / FAIL record)

- `docs/MOB-DISC-GB-PRIVATE-EXTENSIONS-V2-FAIL-20260723.md`
- `docs/MOB-APPLIED-GB-PRIVATE-EXTENSIONS-WITH-KILLSWITCH-V2-20260723.md` (marked FAIL; superseded by this rollback)

## Operator

1. **Restart** Fleet server (so memory loads checkpoint code).  
2. Hard refresh once.  
3. Smoke: live video + SOS + PTT talk cue as before V2.

## Next

No new private-extension APPLY until a fresh MOB DISC for the real WVP/GB path. Do not re-apply V2 as-written.
