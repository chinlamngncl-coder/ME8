# MOB APPLIED — mob-evidence-redact-modal-actions-sticky-v1

**Date:** 2026-07-17  
**Files:** `public/index.html` (CSS) · `public/js/evidence-hub.js`  
**Cache:** `evidence-hub.js?v=20260717-redact-modal-sticky`

---

## What changed

- Modal height locked (`min(92vh, 900px)`) so footer cannot clip off-screen  
- **Save / Cancel** footer: sticky bottom + shadow (`ev-redact-footer-sticky`)  
- Region list scrolls **only** inside `.ev-redact-regions-wrap`  
- Note panel actions also sticky  
- Old dialog DOM without sticky class is rebuilt on open

---

## Operator

1. Hard refresh Evidence  
2. Open Redact → Auto (long list OK)  
3. **Save** and **Cancel** must stay visible without scrolling the whole modal

---

## Rest (remind)

1. ~~action-top~~ done  
2. ~~modal-actions-sticky~~ done  
3. **`mob-evidence-redact-save-progress-v1`** — next  
4. **`mob-evidence-redact-details-before-or-with-save-v1`**
