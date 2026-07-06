# ME8 — Eight BWC product rules (all AI read this)

**Tree:** `C:\Users\user\Desktop\Enterprise Mobility\ME8`  
**Name:** **ME8** = **Enterprise Mobility, 8 body-worn cameras** live in the fleet. Not 6. We are past the 6-camera era.

---

## Live concurrency (fleet / pool / SIP)

| Rule | Value |
|------|--------|
| Max **concurrent live video** (INVITE + pool sessions) | **8** |
| Device IDs | **Dynamic** — from `storage/bwc-devices.json` only. **Never** hardcode cam IDs, names, or array indices. |
| Server cap | `DASHBOARD_MAX_LIVE` / `FM_MAX_CONCURRENT_LIVE` → target **8** |
| Client cap | `MAX_LIVE_STREAMS` in `video-wall.js` → target **8** (must match server) |
| Open All | UI copy: **"Open All (Up to 8)"** — product truth |

**Do not** tell the operator "max 6 live" or cap MOBs at 6 because me8-v1 snapshot still has `6` in some constants. That is **technical debt**, not product spec.

---

## Video wall (Ops panels)

| Rule | Value |
|------|--------|
| Wall **panel slots** on screen | **6** (`SLOT_COUNT`) |
| **Fixed** panels | **4** (slots 0–3 / panels 1–4) — bound in Video Config |
| **Rotation** panels | **2** (slots 4–5 / panels 5–6) — poll extra online BWCs when rotation enabled |
| Map pins | Up to **8** open with live video when fleet is at full live; dock limits are separate from pool cap |

**Wall layout in one line:** **6 panels on the wall — 4 fixed + 2 on rotate.**  
**Fleet live in one line:** **up to 8 BWCs streaming at once** (pool), shown across wall + pins per assignment — not "6 and stop."

---

## Architecture (do not re-break)

1. **One WebSocket owner per cam** — wall panel owns JSMpeg; pin mirrors wall canvas (no second WS per cam).
2. **BWC SIP BYE** — `server.js` alone calls `liveStreamPool.onRemoteBye`; `mediaSession.js` must not consume pool BYE first.
3. **`video-stream-stopped`** — tear down players + show **Stopped**; no fake "Live streaming" on dead streams.
4. **No** 450ms pin resync loops, no `repairOpenPinPopupVideos` painting live without decode.
5. **Restore = 100%** — `RESTORE-ME8-FIRMWARE-GOLD.ps1` is primary. `RESTORE-ME8-V1.ps1` is legacy fallback only. No partial file copy.

---

## Locked / workflow

- `video-wall.js`, `dashboard-boot.js`, PTT/SIP heart — **MOB-APPLY** one fix at a time, user authorizes.
- After server or baseline change: `RESTART-FLEET.bat` + hard refresh.

---

## Code vs product (known gap in me8-v1 baseline)

These still say **6** until a dedicated cap-alignment MOB:

- `server.js` → `DASHBOARD_MAX_LIVE` default `6`
- `video-wall.js` → `MAX_LIVE_STREAMS = 6`
- `dashboard-boot.js` → `MAX_OPEN_PIN_POPUPS = 6` (pin popups on map, not pool cap)

When fixing live video, **align all three to 8** in one MOB — do not patch one file and leave the rest at 6.
