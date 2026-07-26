# MOB APPLIED — VC-LIVE-STAGE-RESTORE-AND-ESCAPE-V1

**Date:** 2026-07-24  
**APPLY:** `MOB-APPLY VC-LIVE-STAGE-RESTORE-AND-ESCAPE-V1`  
**Also:** **BWC6 DISC OK** — share/BWC cap stays **4** (raise is a later MOB)  
**Disc:** `MOB-DISC-VC-LIVE-STAGE-RESTORE-ESCAPE-FAIL-20260724.md`, `MOB-DISC-VC-BWC-TILES-6-LIVEKIT-LIMITS-20260724.md`  
**Status:** APPLIED — operator PASS/FAIL pending  

---

## What we fixed

| Item | Change |
|------|--------|
| Fake expand ⤢ | Tile control is labeled **Focus**; second click exits |
| Escape | **Exit Focus** button on stage; **Esc**; dock **Speaker** clears `pinnedSid` |
| Black void | Stage/body min-height + flex fill; empty Focus demotes to Speaker; waiting copy (not “drop share”) |
| Fill grid | Kept: empty spotlight + tiles in strip → multi-tile grid |
| BWC feedback | Toast: Adding… / LIVE · name / Failed |
| Caps | **Unchanged:** people 8 · filmstrip 6 · share/BWC **4** |

---

## Files

- `public/js/conference-layout.js`
- `public/js/conference-hub.js`
- `public/js/vc-lazy.js`
- `public/index.html` (CSS)
- `public/locales/en.json`, `zh.json`
- `scripts/verify-vc-live-stage-restore-escape-v1.js`

**Cache:** `?v=20260724-vc-live-stage-restore-escape-v1`  
**Verify:** `npm run verify:vc-live-restore`

---

## Operator smoke

1. **Ctrl+F5** → Video Conference → Join Room 1.  
2. See people video in the **middle** (not a lone black band).  
3. **Add to Room** a BWC → toast **Adding…** then **LIVE · name**; tile appears. Second BWC → both visible (cap 4).  
4. Tap **Focus** (dock or tile) → one big feed + **Exit Focus**.  
5. **Exit Focus** / **Speaker** / **Esc** → back to meeting layout.  

Say **PASS** or **FAIL**.
