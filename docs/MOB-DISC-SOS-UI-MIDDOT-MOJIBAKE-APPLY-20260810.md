# MOB DISC — APPLY SOS-UI-MIDDOT-MOJIBAKE-V1 — 2026-08-10

**Status:** APPLIED.  
**APPLY:** `MOB-APPLY SOS-UI-MIDDOT-MOJIBAKE-V1`  
**File:** `public/index.html` only.

---

## Done

| Change | Count |
|--------|-------|
| `Â&middot;` → `&middot;` | 13 |
| `Â\u00B7` → `\u00B7` | 18 |
| `Â©` → `&copy;` | 2 |
| `#sos-banner-nav-hint[hidden]` / live-hint → `display: none !important` | so empty “Nav Hint / Live Hint” stay off |

**Not touched:** `dashboard-boot.js`, `video-wall.js`, SIP, DeviceControl, mute-hold, stop-video.

---

## Operator PASS

Hard refresh → SOS → banner reads `OFFICER IN DISTRESS · kk · time` (clean dots).  
Pin title `kk · … · SOS` — no `Â`.  
No Nav Hint / Live Hint lines on the red strip.
