# MOB-APPLIED — TACTICAL-PREPARE-OPERATE-MODE-FLOW-V1

**Date:** 2026-07-24  
**APPLY:** `TACTICAL-PREPARE-OPERATE-MODE-FLOW-V1`  
**Disc:** `MOB-DISC-TACTICAL-PREPARE-OPERATE-MODE-FLOW-20260724.md`  
**Repairs FAIL:** `TACTICAL-AR-CIRCLE-BATCH-OPEN-V1` (modes fight / Open felt silent)

## What you get

Tactical rail split:

1. **PREPARE** — Place / name / link POIs only  
2. **OPERATE** — **Grab circle** (amber dashed) → **Open grabbed** (cap 8)  
3. **Zones** — Polygon / Zone circle / Edit / Delete / Save (separate)

Exclusive map modes + **banner on the map**:

| Mode | Banner |
|------|--------|
| Idle | Idle — drag map to move |
| Place | PREPARE — click map to place pin |
| Grab | OPERATE — drag on map to draw grab circle |
| Zones | ZONES — draw / edit / delete |

- Arming Place **cancels** Grab (and zone draw), and vice versa  
- **Esc** → Idle  
- Open grabbed: **loud toast** if no circle / nothing inside / opened N  

## Files

- `public/js/tactical-shell.js` — modes, banner, grab vs zone circle  
- `public/js/tactical-poi.js` — place ↔ shell, louder open feedback  
- `public/index.html` — PREPARE / OPERATE / banner markup  
- `public/css/global.css` — banner + operate buttons  
- `public/locales/en.json`, `zh.json`  
- `scripts/verify-tactical-prepare-operate-mode-flow-v1.js`  

**Cache:** `?v=20260724-tactical-prepare-operate-mode-flow-v1`  
**Verify:** `npm run verify:tactical-flow`

## Operator smoke

1. **Ctrl+F5** → **Tactical**  
2. **PREPARE → Place POI** → banner says PREPARE → click map → pin appears → Esc → Idle  
3. **OPERATE → Grab circle** → banner amber → drag circle over pins → toast “Grab circle ready”  
4. **Open grabbed** → streams open **or** clear toast (“Nothing in this circle…” / “Opened N”)  
5. Confirm Place while Grab is armed cancels Grab (and the reverse)

Say **PASS** or **FAIL**.

## Next APPLY (ladder — no wait)

After **PASS** → `MOB-APPLY TACTICAL-ZONE-TURF-ENTRY-EXIT-V1`  
Dual-pane / 6 PiP stays **PARKED**.
