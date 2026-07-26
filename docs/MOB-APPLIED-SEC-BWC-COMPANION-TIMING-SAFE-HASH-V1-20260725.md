# MOB-APPLIED — SEC Phase 1.1 Timing-safe companion token

**Date:** 2026-07-25  
**APPLY / Task:** Phase 1 **Task 1.1** — `SEC-BWC-COMPANION-TIMING-SAFE-HASH-V1`  
**Roadmap:** `MOB-DISC-ARCHITECT-MASTER-ROADMAP-20260725.md`

## Change

`secureTokenEqual` now SHA-256 hashes both strings, then `crypto.timingSafeEqual` on equal-length digests (no raw-length short-circuit).

```js
function secureTokenEqual(actual, expected) {
    if (!actual || !expected) return false;
    const a = crypto.createHash('sha256').update(String(actual), 'utf8').digest();
    const b = crypto.createHash('sha256').update(String(expected), 'utf8').digest();
    return crypto.timingSafeEqual(a, b);
}
```

**Files:** `server.js`, `run.js` (ship parity)  
**Verify:** `npm run verify:sec-companion-timing`

## Operator smoke

Restart Fleet. Companion / BWC token routes that use `FM_BWC_COMPANION_TOKEN` still accept the correct token and reject wrong ones.

Say **PASS** (then we do Task 1.2 only) or **FAIL**.

## Next (do not start until PASS)

**Task 1.2** — `SEC-SOS-OPEN-EXPLORER-NO-CMD-V1`
