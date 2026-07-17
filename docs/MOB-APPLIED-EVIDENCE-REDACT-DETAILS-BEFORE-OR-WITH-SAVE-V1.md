# MOB APPLIED — mob-evidence-redact-details-before-or-with-save-v1

**Date:** 2026-07-17  
**Files:** `public/js/evidence-hub.js` · `public/index.html` · `public/locales/en.json` · `lib/evidenceWorkflow.js` · `server.js`  
**Cache:** `?v=20260717-redact-details-with-save`

---

## What changed

| Before | After |
|--------|--------|
| Reason / visible / incident only **after** burn finished | **Draft fields on mark panel** — type before or during Save |
| Hang Save = no details UI | Details always visible while marking |
| Meta empty until note panel | Save POST seeds meta; status `draft` if reason set |

---

## Operator

1. Hard refresh Evidence  
2. Redact → see **details block** in right rail (above preview list)  
3. Fill reason / visible / note → Save (can keep editing while progress ticks)  
4. After burn: finalize panel opens with those values  

---

## UX genre complete (this list)

1. ~~action-top~~  
2. ~~modal-actions-sticky~~  
3. ~~save-progress~~  
4. ~~details-before-or-with-save~~ **done**
