# MOB APPLIED — mob-evidence-redact-save-progress-v1

**Date:** 2026-07-17  
**Files:** `public/js/evidence-hub.js` · `public/index.html` · `public/locales/en.json`  
**Cache:** `?v=20260717-redact-save-progress`

---

## What changed

| Before | After |
|--------|--------|
| One frozen “Saving…” line | Elapsed timer: “Still working — Xm Ys…” |
| Cancel only closed dialog | **Cancel during Save** aborts wait + clear error |
| Could look hung forever | Client soft timeout **12 min** → clear timeout message |
| No progress strip | Sticky footer `#ev-redact-save-progress` |

Does **not** speed up face-follow burn (server still long). Makes hang honest + escapable.

---

## Operator

1. Hard refresh Evidence  
2. Redact → Auto → Save  
3. Expect blue progress with elapsed time  
4. Cancel should stop waiting (Save re-enabled)

---

## Rest (remind)

1. ~~action-top~~  
2. ~~modal-actions-sticky~~  
3. ~~save-progress~~ **done**  
4. **`mob-evidence-redact-details-before-or-with-save-v1`** — last in this UX list  
