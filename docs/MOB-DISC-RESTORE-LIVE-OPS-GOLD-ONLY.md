# MOB — Restore live ops from firmware gold (APPLIED)

**MOB:** `mob-restore-video-wall-fleet-from-gold` — **APPLIED** 2026-07-10  
**Why:** Investigation found post-gold drift on locked live files (`video-wall.js`, `fleet-ui.js`). That broke the Open All / Call / Live path. Restore those only.

---

## Copied (from `baseline/2026-07-06-me8-firmware-gold/`)

| File | Result |
|------|--------|
| `public/js/video-wall.js` | Restored — MD5 **SAME** as gold |
| `public/js/fleet-ui.js` | Restored — MD5 **SAME** as gold |
| `public/js/ptt-rx.js` | Already SAME — not overwritten |

## Cache-bust only (`index.html`)

- `video-wall.js?v=20260706-firmware-gold`
- `fleet-ui.js?v=20260706-firmware-gold`

## Not touched

FR / Analytics / enroll / offline video / crop rail / watchlist / `index.html` logic beyond those two `?v=` lines.

---

## Soak (required)

Hard refresh Ops (Ctrl+F5) so old `wall-claim` cache dies.

1. One cam live → stop  
2. Open All lite (Chin + kk) → live on wall + pins  
3. Call / PTT smoke → stop all  

Reply **CHECKPOINT PASS** or **CHECKPOINT FAIL** (+ what broke).
