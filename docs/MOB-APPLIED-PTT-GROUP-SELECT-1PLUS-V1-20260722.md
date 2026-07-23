# MOB APPLIED — PTT-GROUP-SELECT-1PLUS-V1

**Date:** 2026-07-22  
**Status:** SUPERSEDED — Join 1+ was a gate only; operator called it useless vs wall 1:1.  
**Replaced by:** `PTT-GROUP-NET-MESH-AND-TALK-V1` (Join **2+** + Hold Group PTT + field mesh).  
**Disc:** `MOB-DISC-PTT-GROUP-SELECT-LOGIC-WRONG-20260720.md`, `MOB-DISC-PTT-GROUP-WHERE-AND-WHAT-20260722.md`  
**Prior PASS:** `WALL-AUDIO-PATH-V1`

---

## Problem

Left-panel **PTT GROUPS** Join required **2+** everywhere — 1-member map group could not Join; fleet ticks ignored when a map group was selected. Felt “useless.”

---

## Fix

| Area | Change |
|------|--------|
| **Join gate** | Enabled when **≥ 1** member picked |
| **Candidates** | Map group roster **∪** fleet online ticks (cross-group) |
| **Join body** | All picks inside group → `{ groupId, camIds }`; extras outside group → ad hoc `{ camIds }` |
| **Server** | `/api/dispatch-ptt-group` allows team size **≥ 1** |
| **Wall hold** | `resolvePttTalkCamIds` fans out for dispatch team **length ≥ 1** |
| **i18n** | Hints say **1+** (en + zh/ko/id/th/fil) |

**Not changed:** Field BWC↔BWC mesh (`SOS-GROUP-FIELD-RX-RELAY-V1`). Call / wall unmute.

---

## Files

- `public/index.html`, `public/js/dashboard-boot.js`
- `server.js`
- `public/js/video-wall.js` (`?v=20260722-ptt-group-1plus-v1`)
- `public/locales/{en,zh,ko,id,th,fil}.json`

---

## Operator verify

1. **Restart Fleet** + **Ctrl+F5**
2. Left **PTT GROUPS** — map group with **1** device (e.g. Chin) → **Join** enabled → Join succeeds
3. Or clear dropdown → tick **1+** online on fleet → Join
4. Map group + tick another cam from another colour → chips show both → Join → hold PTT → both hear HQ (if 2 online)
5. **Ungroup** → back to 1:1 PTT

PASS / FAIL from what you see/hear.
