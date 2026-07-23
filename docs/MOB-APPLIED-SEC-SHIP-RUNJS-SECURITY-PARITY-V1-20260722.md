# MOB APPLIED — Ship run.js security parity V1

**Date:** 2026-07-22  
**MOB:** `mob-sec-ship-runjs-security-parity-v1`

## Applied

- Rebuilt repo-root `run.js` from current `server.js` + live `lib/` using
  `scripts/build-ship-runtime.js` (esbuild Node 22 bundle, external packages).
- Added `npm run build:runjs` and `npm run verify:runjs`.
- Wired ship-runtime security parity into the main `npm run verify` gate.

## Security contracts now present in `run.js`

| Contract | Marker |
|----------|--------|
| Fatal exit on uncaught errors | `installFatalProcessPolicy`, `exiting for supervisor restart` |
| Bounded login LRU | `createLoginRateLimiter`, `maxEntries: 5000` |
| SIP crypto Call-IDs | `createSipCallId` (no SIP `Math.random` Call-ID) |
| SOS ACK ends group call | `sos_acknowledged` |

## Stale markers removed

- `process kept alive`
- unbounded `_loginAttempts` Map
- SIP `'call-id': Math.random(...)` generators

## Verification

- `node --check run.js`: PASS
- `npm run verify:runjs`: PASS
- Full `npm run verify`: PASS

## Notes

- Lab Windows service continues to run `server.js`; this MOB is for **ship bundle
  parity** so customer packs built from this tree do not ship yesterday’s insecure
  runtime snapshot.
- Future packs (`PACK-SHIP-DELIVERY` / PH-KR oneshot) already call
  `build-ship-runtime.js` at pack time; the rebuilt root `run.js` is the checked-in
  safety net and verify target.

## Outside this MOB

- Valkey runtime state / Redis replacement
- About/Help legal center
- Non-SIP `Math.random` IDs (fixed-cam / share filenames)
