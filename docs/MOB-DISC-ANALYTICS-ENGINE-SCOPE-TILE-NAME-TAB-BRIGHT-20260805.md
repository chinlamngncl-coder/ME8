# MOB DISC — FR engine leak, tile names, brighter tabs (2026-08-05)

**Status:** APPLIED `ANALYTICS-ENGINE-SCOPE-TILE-NAME-TAB-BRIGHT-V1` (2026-08-05).  
**Related:** Weapon shell APPLIED; pending squeeze disc is separate.  
**Scope:** Analytics hub chrome only. No engine logic. No ANPR roster squeeze in this MOB.

## Confirm: I understand

1. On **ANPR** you see a **duplicate FR Engine — OK**. ANPR is ANPR. It already has its own engine hint/sign. FR does not belong there.
2. **Weapon** must not use or show **FR engine**. Different module.
3. BWC / camera **name is not on the bottom** of live tiles. Unify FR / ANPR / Weapon.
4. Analytics tabs look **dull**. Brighten them to sit with the rest of the app tabs.

## What went wrong (honest)

FR engine pill (`#ax-fr-sidecar-status`) sits in the **shared** Analytics header, above Face / ANPR / Weapon.

JS tries to `hidden` it off FR. The pill class still forces `display: inline-flex`, and the node stays in that shared header — so **FR Engine — OK** can still show on ANPR (and Weapon). That is a leak from the FR-health-under-subnav work. Not an ANPR engine change.

ANPR already has **one** correct pill: `#ax-anpr-status` on the ANPR subnav (**ANPR Engine — OK** / down).

Weapon shell added **Weapon Engine — Not ready** (stub). It does **nothing** with FR. If you also see FR Engine on Weapon, that is the same leak.

## Locked rules

### Engine pills — one module, one pill

| Surface | Show | Never show |
|---------|------|------------|
| Face / Verify / Watchlist | **FR Engine** only | ANPR / Weapon |
| ANPR (all ANPR subs) | **ANPR Engine** only (existing pill) | FR / Weapon |
| Weapon | **Weapon Engine** stub only | FR / ANPR |

- **Take the FR pill off ANPR and Weapon.** Hard hide: `[hidden] { display: none !important }` and/or move FR pill **inside** the FR panel so it cannot leak.
- **Keep** the existing ANPR engine pill. Do **not** delete ANPR health. “Take Engine — OK away” here means **take the duplicate / wrong FR OK off ANPR**, not kill ANPR’s own sign.
- Weapon: **no FR**. Stub stays **Weapon Engine — Not ready** until a real weapon engine exists. No fake OK.

### Tile names — bottom bar, all three live walls

Today live tiles **hide** the top-left name when video is live (no chrome over the picture). Result: you cannot see who is on the tile.

Unify FR + ANPR + Weapon:

- Thin **bottom name bar** on the tile (inside the cell, not a second layout).
- Text = display name (Chin / kk / …). Slot number optional, small, left of the name.
- Idle tile: no name bar (or slot number only).
- Top-left overlay stays **off** while live (FOV rule stays).
- Same bar style on all three modules.

### Tabs — brighter, same family

Analytics L1 (Face / ANPR / Weapon), FR L2, ANPR subnav (Live / Snapshot / …):

- Inactive now: dark `#1e293b` + muted `#cbd5e1` → looks dull vs app tabs.
- Target inactive: bg **`#334155`**, text **`#f1f5f9`**, border `#64748b`.
- Active stays **blue** (`#2563eb`) so the selected tab is obvious.
- Font sizes stay (L1 13 / L2 11 Inter). Colour only.

Do not restyle the main app top nav (Operations / Evidence / …).

## Out of scope

- Weapon detect engine / alarm
- ANPR roster group squeeze (still the other disc)
- FR match / ANPR OCR behaviour

## One next APPLY

**`MOB-APPLY ANALYTICS-ENGINE-SCOPE-TILE-NAME-TAB-BRIGHT-V1`**

Do this **before** the detect-grid / ANPR-roster squeeze APPLY.

Queued after PASS: `WEAPON-DETECT-GRID-ANPR-ROSTER-SQUEEZE-V1`

## Operator pass

Hard-refresh Analytics (restart only if server was already up from Weapon shell — this MOB is UI).

- ANPR: only **ANPR Engine** sign. No **FR Engine**.
- Weapon: only **Weapon Engine — Not ready**. No FR.
- Face: FR engine still there.
- Live tile (FR / ANPR / Weapon): name on the **bottom** when that cam is on the tile.
- Analytics tabs look brighter, still clearly active vs idle.
