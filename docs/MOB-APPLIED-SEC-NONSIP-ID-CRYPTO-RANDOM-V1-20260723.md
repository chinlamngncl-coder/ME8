# MOB APPLIED — SEC-NONSIP-ID-CRYPTO-RANDOM-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY SEC-NONSIP-ID-CRYPTO-RANDOM-V1`  
**Handoff:** `MOB-DISC-THIRD-PARTY-SECURITY-HARDENING-HANDOFF-20260722.md` (B3)

## What changed

| Site | Before | After |
|------|--------|-------|
| `lib/fixedCamRegistry.js` | `Math.random` base36 | `secureId.fixedCamId()` → `crypto.randomBytes` |
| `lib/conferenceModule.js` | share file `Math.random` | `secureId.conferenceShareFileName()` |
| `server.js` FR multer temps (3) | `Math.random` suffix | `secureId.multerTempFileName()` |
| `public/js/command-wall.js` | owner token `Math.random` | `crypto.getRandomValues` |

New helper: `lib/secureId.js` (SIP IDs stay in `sipCryptoIdentifiers.js`).

## Verify

- `npm run verify:nonsip-id` → **PASS**
- `npm run build:runjs` + ship parity → **PASS**
- Cache: `command-wall.js?v=20260723-sec-nonsip-id-crypto-v1`

## Operator

1. Restart Fleet (server + `run.js` ship bundle updated).  
2. Ctrl+F5 once if using Command Wall.  
3. Smoke: add a fixed cam / FR verify upload / conference share — still works; no operator-visible ID format change needed.

## Outside

Baselines untouched. Vendor minified JS untouched.
