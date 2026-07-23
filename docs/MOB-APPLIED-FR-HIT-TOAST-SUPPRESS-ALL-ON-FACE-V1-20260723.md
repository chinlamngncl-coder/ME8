# MOB APPLIED — FR-HIT-TOAST-SUPPRESS-ALL-ON-FACE-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY FR-HIT-TOAST-SUPPRESS-ALL-ON-FACE-V1`  
**Disc:** `MOB-DISC-FR-FACE-TOAST-BACK-AND-BLACKLIST-STATUS-20260723.md`  
**Prior PASS:** `FR-GRADE-COLOUR-TOAST-NO-JUMP-V1`

## What changed

On **Analytics → Face**, floating toast is hidden for **all** grades (POI / monitoring / suspect / blacklist).  
**Coloured HQ bar** still shows grade + name/%.  
Toast still appears on other tabs (Ops, Evidence, …). Lab Preview toast unchanged (`_labPreview`).

**File:** `public/js/fr-alarm.js`  
**Cache:** `fr-alarm.js?v=20260723-fr-toast-suppress-all-on-face-v1`

**Operator:** **PASS** 2026-07-23 — no float on Face for any grade; HQ bar keeps colour.

## Next

`MOB-APPLY FR-BLACKLIST-MAP-PIN-TAKEOVER-V1`
