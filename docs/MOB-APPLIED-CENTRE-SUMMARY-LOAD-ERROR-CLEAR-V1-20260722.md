# MOB-APPLIED — CENTRE-SUMMARY-LOAD-ERROR-CLEAR-V1

**Date:** 2026-07-22  
**APPLY:** `MOB-APPLY CENTRE-SUMMARY-LOAD-ERROR-CLEAR-V1`  
**Disc:** `MOB-DISC-REMAINING-CENTRE-FR-LOCK-GPS-SNAPSHOT-20260722.md`

## What changed

1. On load **fail**, subtitle `#cs-generated-at` is **cleared** of stuck **“Loading…”** — shows auth text or “Load failed — try Refresh…”.  
2. Red error bar keeps an honest message; **401/403** → Super admin login required (not remapped generic only).  
3. On Refresh / new load: error bar cleared; subtitle set to Loading again until success/fail.

## Files

| File | Change |
|------|--------|
| `public/js/command-centre.js` | `showError` + `beginCentreLoadUi`; auth flag on catch |
| `public/locales/*.json` | `centre.error.loadFailedSub` |
| Cache | `command-centre.js?v=20260722-centre-load-error-clear-v1` |

## Operator verify

1. **Ctrl+F5**  
2. Open **Centre Summary**  
3. If it fails: subtitle is **not** stuck on “Loading…”; red bar + subtitle show fail/auth  
4. Click **Refresh** — can retry; success shows “Updated …”  

**PASS / FAIL:** _(operator)_

**Next in remaining queue:** `WVP-PRESENCE-REPLAY-GPS-ON-ONLINE-V1`
