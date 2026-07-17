# MOB APPLIED — `mob-evidence-crypto-badge-no-legacy-v1`

**Date:** 2026-07-16  
**Status:** APPLIED  
**Parent:** `docs/MOB-DISC-EVIDENCE-CRYPTO-BADGE-NO-LEGACY.md`

---

## Change

| Key | Before | After |
|-----|--------|-------|
| `evidenceHub.cryptoPlaintext` (`public/locales/en.json`) | Plaintext (legacy) | **Not encrypted** |

- `evidence-hub.js` unchanged — still uses `tr('evidenceHub.cryptoPlaintext')`
- Crypto engine / encrypt-on-ingest **not** touched
- Disc note in `MOB-DISC-EVIDENCE-CRYPTO-METADATA-A-TAGS.md` updated to match

---

## Operator

Hard refresh Evidence Hub → detail Status chip must read **Not encrypted** (no “legacy”).
