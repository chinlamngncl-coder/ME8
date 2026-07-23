# MOB APPLIED — PIN-LINK-CLASSIC-PASS-PLAYER-GRAFT-V1

**Date:** 2026-07-21  
**Status:** APPLIED — operator test pending  
**Disc:** `MOB-DISC-FAIL-PIN-EMPTY-OPENALL-KK-TRIPLE-BASELINE-COMPARE-20260721.md`  
**Scope:** `public/js/video-wall.js` + cache bust `public/index.html`

---

## What we did

| Step | Detail |
|------|--------|
| **Link classic** | From `baseline/2026-07-18-classic-pass/public/js/video-wall.js`: `attachMapPopupPlayer`, `focusMapPinQuiet`, `startMapMirrorFromWall` (byte-linked then minimal graft) |
| **Verify** | `focusMapPinQuiet` **SHA matches classic** after link |
| **Graft player only** | `wallHandoffVideoForCam` + `wallMirrorSourceForCam` (canvas first, else handoff `<video>` when wall decoded) |
| **Graft mirror** | Classic RAF loop + `videoWidth`/`videoHeight` when source is video |
| **Graft attach gate** | `wallMirrorSourceForCam(camId)` instead of canvas-only |
| **Keep** | `attachWvpHandoffFlv*` / handoff maps; `ensurePopups…` untouched (already identical); `openAllLivePins` untouched (already = classic) |
| **No** | chase timers, FOCUSED-OPEN, Fit pins rewrite |

Cache: `video-wall.js?v=20260721-pin-link-classic-pass-player-graft-v1`

---

## Operator test (hard refresh once — no bat)

1. Ctrl+Shift+R  
2. Soft Open / play wall Live  
3. **Click pin** → chrome + picture (not empty)  
4. **Call / PTT / Stop** usable  
5. **Open All** → Chin **and kk** both stay  

| PASS | FAIL |
|------|------|
| Pin click works; Open All keeps both cams | Say which line (pin empty / kk gone / Call) |

---

## Next

Only after your PASS — harm plan audio or you name the next MOB. No more pin-layout inventions unless you order.
