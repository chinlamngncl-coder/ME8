# MOB DISC — Slim pin video box for 8-on-map layout

**Status:** APPLIED — `MOB-APPLY-PIN-POPUP-SLIM-8` · 2026-07-19  
**Search:** pin popup slim, 8 video layout, one-line title, telemetry spacing, button height  
**Operator:** kk / Chin pin box too tall/wide chrome; need denser map for **8** live pins  
**Boundary:** Do **not** disturb pin video function (ZLM mirror / play / Call / PTT / Stop logic)

---

## Understood (locked intent)

| # | Ask | Meaning |
|---|-----|---------|
| 1 | Top slimmer | **Name + short ID + Patrol/SOS** on **one line** (not name on row 1, ID+badge on row 2) |
| 2 | Bottom slimmer | DEVICE STATUS / telemetry: less padding and row gap — keep same fields |
| 3 | Buttons smaller | Call / PTT / Stop live — shorter height / tighter padding |
| Goal | **8-video layout** | Chrome must shrink so 8 docked pins fit without fighting the map |

**Not in this MOB:** change WVP/ZLM play, mirror, SIP, wall panels, or button *behavior* — chrome/CSS (+ small head HTML merge) only.

---

## APPLIED (2026-07-19)

| Change | Where |
|--------|--------|
| Panel width **300 → 260px** | `.map-popup` in `public/index.html` |
| Video height **136 → 118px** | `.media-box.map-pin-video` |
| One-line head: `name · id · PATROL/SOS` | `mapPopupHeadHtml` in `index.html` (+ mirror in `dashboard-boot.js`) |
| Buttons **min-height 28px**, tighter bar pad | `.map-pin-video-bar` / play/stop/call/ptt |
| Telemetry tighter gaps | `.map-popup-telemetry` / tel-title / tel-grid / tel-row |
| **No** `video-wall.js` pin play/mirror edits | — |

**Operator check:** hard refresh Ops → open several pins (aim 8) → confirm one-line title, smaller buttons, denser telemetry; video still mirrors / plays.

---

## Risk (low if scoped)

| Risk | Mitigation |
|------|------------|
| Touch pin **JS** by mistake | APPLY: CSS + `mapPopupHeadHtml` only; no `attachMapPopupPlayer` / mirror / stop |
| Long names overflow one line | Ellipsis + `title=` tooltip (already on title) |
| Dock layout math | After slim, re-check colocated dock / 8-pin fan — visual PASS |
| Firmware Gold pin video | **No** change to mirror/canvas/video attach |

---

## One line

Slim chrome for 8 pins: CSS + one-line head HTML; pin video function untouched.
