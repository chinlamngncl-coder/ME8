# MOB APPLIED — USER-CIRCLE-BATCH-OPEN-V1

**Date:** 2026-07-24  
**APPLY:** `MOB-APPLY USER-CIRCLE-BATCH-OPEN-V1`  
**Disc:** `MOB-DISC-USER-CIRCLE-BATCH-OPEN-8-10-20260724.md`, `MOB-DISC-USER-CIRCLE-OVERFLOW-CAP-8-20260724.md`  
**Status:** APPLIED — operator PASS/FAIL pending  

---

## What you get

Ops sidebar **User Circle** under Open All:

| Control | Action |
|---------|--------|
| Dropdown | Pick saved circle (shows name + count) |
| **Open Circle** | Opens online members via existing Open All / `openAllLivePins` path |
| **Save selection** | Save current pin checkboxes as a named circle |
| **Add to circle** | Append current selection (circle can grow **past 8**) |
| **Delete** | Remove active circle |

**Open cap = 8** (wall full). If circle has more: toast **Opened N of total — wall full**. Offline members skipped with toast.

Storage: `localStorage` key `me8.userCircles.v1` (this browser).

---

## Files

- `public/js/fleet-ui.js`
- `public/index.html` (UI + CSS + cache)
- `public/locales/en.json`, `zh.json`
- `scripts/verify-user-circle-batch-open-v1.js`

**Cache:** `fleet-ui.js?v=20260724-user-circle-batch-open-v1`

**Verify:** `npm run verify:user-circle`

---

## Out of scope (unchanged)

- Wall capacity 10  
- Tactical incident circle  
- VC restore  
- New video player / Firmware Gold pin cores  

---

## Operator smoke

1. **Ctrl+F5**  
2. Ops → check 2–3 online devices → **Save selection** → name it  
3. **Open Circle** → pins + wall open (same as Open All)  
4. Add more devices over time with **Add to circle** until count **> 8** → Open → see **Opened 8 of N — wall full**  
5. **Delete** removes the circle  

Say **PASS** or **FAIL**.
