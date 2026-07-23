# MOB DISC — SOS visibility on FR / all tabs (banner vs video overlay)

**Status:** DISC 2026-07-13 — **`mob-fr-tile-sos-badge` APPLIED 2026-07-13**  
**Trigger:** Checkpoint PASS (SOS → Ops map resize). Operator asks: on FR video page, no “Stopped by BWC” / SOS message on the tile — is banner enough? And can other pages (e.g. Command Wall) still use Ops / all tabs during SOS?  
**Search:** SOS banner, FR tile overlay, Stopped by BWC, command wall, nonblocking nav, analytics popout  
**Related:** `MOB-DISC-SOS-BANNER-NONBLOCKING-NAV.md` (APPLIED), `MOB-DISC-OPS-MAP-RESIZE-AFTER-TAB.md` (APPLIED)

---

## Short answers

| Question | Answer |
|----------|--------|
| Why no “Stopped by BWC” / SOS text on FR videos (before this MOB)? | Those overlays live on **Ops wall / map pins** (`video-wall.js`). FR tiles had **no** SOS chip. |
| Is the **banner** enough? | Still primary on main dashboard. **Tile chip** helps when heads-down on FR or Analytics **pop-out** (banner hidden). |
| Can I work Ops / all pages while SOS is up (e.g. from Command Wall)? | **Yes.** Tabs stay clickable without ACK. |

---

## Two different messages (do not mix)

| Message | Meaning | Where |
|---------|---------|-------|
| **SOS banner** | Active incident; ACK owns it | `#sos-banner` under top nav |
| **FR tile chip `SOS` / `FALL`** | This tile’s BWC is in active alarm | `mob-fr-tile-sos-badge` — alarming cam only |
| **“SOS live video”** | Ops wall/pin alarm stream label | `video-wall.js` |
| **“Stopped by BWC”** | Device **ended** the live stream | Ops wall / map pin only — **never** reuse for SOS |

---

## APPLIED — `mob-fr-tile-sos-badge`

| File | Change |
|------|--------|
| `public/js/fr-live-watch.js` | Corner chip; `sos-alarm` / `sos-acknowledged`; sync via `getActiveSosCamIds` |
| `public/index.html` | CSS `.ax-fr-tile-sos-badge`; cache-bust |
| `public/locales/en.json` | `analytics.fr.tileSosBadge` / `tileFallBadge` (+ titles) |

**Not changed:** wall, PTT, SOS ACK payload, “Stopped by BWC” path, `fleet-ui.js`.

### PASS check

1. Start FR watch with SOS cam on a live tile → red **SOS** chip (orange **FALL** for fall)  
2. ACK → chip clears  
3. Non-SOS tiles unchanged  
4. Analytics pop-out: chip still visible even if banner hidden  

---

## Still parked

| MOB | When |
|-----|------|
| `mob-sos-banner-analytics-popout` | Optional compact banner on pop-out (chip may be enough) |
| `mob-sos-banner-minimize` | Optional collapse |

---

## All pages during SOS

ACK clears ownership; **tabs always usable** (Ops, CW, Evidence, …) — see `MOB-DISC-SOS-BANNER-NONBLOCKING-NAV.md`.
