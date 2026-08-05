# MOB DISC — FR engine leak on ANPR/Weapon + tile name bottom + brighter tabs (2026-08-05)

**Status:** disc only. No code until you type the APPLY line below.  
**Related:** Weapon shell; FR engine health under Live Watch; pending detect-grid / ANPR roster squeeze (separate).  
**Scope:** Analytics hub chrome only. No engine logic. No roster squeeze in this MOB.

## Confirm: I understand

1. On **ANPR** you see a **duplicate FR Engine — OK**. ANPR is ANPR. It already has its own engine hint. That FR pill must not be there.
2. **Weapon** has nothing to do with the FR engine. Why is FR showing there?
3. **BWC name** is missing on the live tile (especially when video is live). Put it on the **bottom**. Unify FR / ANPR / Weapon.
4. Analytics **tabs look dull**. Brighten them to match the rest of the tab family.

## 1) Engine pills — one module, one sign

What went wrong (honest):

- FR health lives in the hub header (`#ax-fr-sidecar-status`).
- Hub sets `hidden` off FR pages, but `.ax-engine-health { display: inline-flex }` **beats** the `hidden` attribute. The FR pill stays on screen.
- ANPR already has **its own** `#ax-anpr-status` (“ANPR Engine — OK”) on the ANPR subnav.
- Weapon has **its own stub** (`#ax-wd-engine-health`, Not ready). It must never read FR.

Locked:

| Page | Show | Never show |
|------|------|------------|
| FR Live / Verify / Watchlist | **FR Engine** only | ANPR / Weapon pills |
| ANPR (all subs) | **ANPR Engine** only (`#ax-anpr-status`, already there) | **FR Engine** |
| Weapon | **Weapon Engine** stub only | **FR Engine** |

Fix: `display: none !important` when `[hidden]`, and keep hub hide/show. **Do not delete** ANPR’s own engine sign. “Take FR-on-ANPR away.” Weapon stays Weapon stub — not FR.

## 2) Tile name — bottom bar, all three live walls

Today a “no chrome over live FOV” rule **hides** the name when the tile is live (ANPR JS + CSS; FR CSS). That is why the BWC name is gone.

Locked unify (FR 6-tile + ANPR 2×2 + Weapon 6-tile):

```
┌─────────────────────┐
│                     │
│        video        │
│                     │
├─────────────────────┤
│ Chin                │  ← bottom, always if a cam is on that tile
└─────────────────────┘
```

- **Display name** only (not `1 · Chin · …id`).
- Visible **while live** (bottom strip, not a top watermark).
- Idle tile: no name bar.
- Same look on FR, ANPR, Weapon.

## 3) Tabs brighter (L1 + L2)

Dull now: dark chip `#1e293b` + grey `#cbd5e1`, L2 weight 400 / 11px.

Locked — **Face / ANPR / Weapon** and **FR subs + ANPR subs** same chips:

- Idle: background `#334155`, text `#f1f5f9`, border `#64748b`
- Active: keep blue `#2563eb` + white (already bright)
- Do **not** restyle the main app top nav (Ops / Evidence / …)

## Out of scope

- Weapon detect engine / fake hits
- ANPR roster group squeeze / Recent 16:9 grid (still the other disc)
- FR match engine, ANPR OCR path

## One next APPLY

**`MOB-APPLY ANALYTICS-ENGINE-SCOPE-TILE-NAME-TAB-V1`**

Do this **before** the detect-grid / ANPR roster squeeze APPLY. Engine leak is the visible break.

## Operator pass

Hard-refresh Analytics (restart only if you already needed it).

- ANPR: **one** ANPR Engine sign. **No** FR Engine.
- Weapon: Weapon Engine stub only. **No** FR Engine.
- Live tile with a cam: **name on the bottom**, still there when video is live.
- Face / ANPR / Weapon / sub tabs look brighter, same family.
