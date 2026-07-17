# MOB APPLIED — mob-evidence-redact-action-top-v1

**Date:** 2026-07-17  
**Disc:** `docs/MOB-DISC-REDACT-BURIED-SCROLL-CLIENT-SHAME.md`  
**File:** `public/js/evidence-hub.js` · cache `?v=20260717-redact-action-top`

---

## What changed

- **Redact** moved into **top** `ev-detail-side-actions` (first button when super-admin)  
- Removed from below custody log  
- Permission unchanged (super-admin only)

---

## Operator

1. Hard refresh Evidence (or restart if you prefer)  
2. Open a video detail  
3. **Redact** should be near Save / top actions — no scroll to floor

---

## Rest (remind — not APPLIED yet)

Recommended order after this:

1. ~~`mob-evidence-redact-action-top-v1`~~ **done**  
2. **`mob-evidence-redact-modal-actions-sticky-v1`** — Save/Cancel sticky in redact modal  
3. **`mob-evidence-redact-save-progress-v1`** — Save progress / timeout / cancel (no forever hang)  
4. **`mob-evidence-redact-details-before-or-with-save-v1`** — details without waiting for burn  

Say **MOB-APPLY** for the next one when ready.
