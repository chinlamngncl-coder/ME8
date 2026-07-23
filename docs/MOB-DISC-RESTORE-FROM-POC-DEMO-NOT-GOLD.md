# MOB — Restore live ops from yesterday POC (APPLIED)

**MOB:** `mob-restore-video-wall-fleet-from-poc-demo` — **APPLIED** 2026-07-10  
**Source:** `baseline/2026-07-09-me8-poc-demo/` only  
**Not done:** full tree wipe, gold restore, FR touch

---

## Copied

| File | Result |
|------|--------|
| `public/js/video-wall.js` | SAME as POC |
| `public/js/fleet-ui.js` | SAME as POC |
| `public/js/ptt-rx.js` | Already SAME — left alone |

## Cache-bust (`index.html` script tags only)

- `video-wall.js?v=20260709-wall-claim`
- `fleet-ui.js?v=20260706-eight-cap-align`

## Untouched

Today’s FR / Analytics / enroll / offline video / watchlist / other genres.

---

Hard refresh Ops (Ctrl+F5). Open All / Call / Live soak.  
Reply **CHECKPOINT PASS** or **CHECKPOINT FAIL** (+ what broke).
