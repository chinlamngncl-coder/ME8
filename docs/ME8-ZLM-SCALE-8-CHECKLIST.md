# ME8 ZLM scale-8 — concurrent live + failover drills

**MOB:** `mob-me8-zlm-scale-8`  
**Tree:** `C:\Users\user\Desktop\Enterprise Mobility\ME8`  
**Prereq:** MOBs 3–6 done (`zlm-sidecar`, ingest, failover, wall MVP)  
**Cap alignment:** server + client live max = **8** (`FM_MAX_CONCURRENT_LIVE`, `MAX_LIVE_STREAMS`)

---

## Pre-flight

| Step | Pass? |
|------|-------|
| `.\RESTART-FLEET.bat` | ☐ |
| Ctrl+Shift+R on `:3988` | ☐ |
| ZLM enabled on bench (if testing ZLM path) | ☐ |
| At least **2** lab BWCs online (8 ideal for Z4) | ☐ |

---

## Z4 — eight concurrent live (ffmpeg or ZLM)

| # | Test | Pass? | Notes |
|---|------|-------|-------|
| Z4.1 | Start live on **8** distinct BWCs (wall + pins as needed) | ☐ | |
| Z4.2 | All **8** show picture within product timeout | ☐ | |
| Z4.3 | **9th** Start live — queued, warned, or rejected (no silent fail) | ☐ | |
| Z4.4 | Stop one — **7** remain live; start another — back to 8 | ☐ | |
| Z4.5 | Hold **8** stable **15 min** (ZLM bench) or **5 min** (ffmpeg-only) | ☐ | |

---

## Failover drills (ZLM bench — required before ship default)

| # | Drill | Pass? | Operator sees |
|---|-------|-------|---------------|
| F1 | Stop ZLM → Start live → picture via fallback | ☐ | Normal video |
| F2 | ZLM up but block publish → failover within ~8 s | ☐ | Normal video |
| F3 | Kill ZLM **mid-stream** → picture ≤ ~5 s | ☐ | Brief connecting at most |
| F4 | **8** ZLM streams stable 30 min | ☐ | (stretch after Z4.5) |

Log review: `storage/fleet.log` — `zlm failover` lines present; **not** shown in operator UI.

---

## Cap constants (MOB 7)

These must all read **8**:

| Location | Constant |
|----------|----------|
| `server.js` | `DASHBOARD_MAX_LIVE` default |
| `.env.me8.example` | `FM_MAX_CONCURRENT_LIVE=8` |
| `public/js/video-wall.js` | `MAX_LIVE_STREAMS` |
| `public/js/dashboard-boot.js` | `MAX_OPEN_PIN_POPUPS`, `PIN_LAZY_LIVE_FULL_MAX` |
| `public/index.html` (inline boot) | same pin constants |
| `public/js/fleet-ui.js` | `MAX_PIN_SELECT` |

UI copy: **Open All (Up to 8)** — already in locales.

---

## Sign-off

**Tester / date:** _______________  
**Engine path tested:** ffmpeg-only / ZLM primary  
**Result:** CHECKPOINT PASS (scale-8) / CHECKPOINT FAIL — _______________

**Next MOB:** Ship default `zlm-primary-ffmpeg-fallback` in BUILD (after F1–F3 + Z4 PASS).
