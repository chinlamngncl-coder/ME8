# MOB DISC — FR UI: header Known Subjects + Recent 12 + BWC scroll (2026-08-05)

**Status:** APPLIED `FR-UI-HEADER-KS-RECENT12-BWC-SCROLL-V1` (2026-08-05).  
**Scope:** FR Analytics layout chrome only. No firewall / storage / sidecar / ANPR Live 3-col changes in this MOB.

## Confirm: I understand the drawing

```
┌─ Header band (2 nav rows + empty right) ─────────────────────────────────────┐
│ [Face] [ANPR] [Weapon]                    KNOWN SUBJECTS                      │
│ [Live Watch] [Load video] [Verify] [Watchlist]   [1][2][3][4][5][6]         │
│                                              6 bigger chips in the red box   │
└──────────────────────────────────────────────────────────────────────────────┘
┌─ 3×2 live tiles (unchanged) ─────────────────────┬─ RECENT 2-col × 6 = 12 ──┐
│  Waiting / Waiting / Waiting                     │  scroll when > 12         │
│  Waiting / Waiting / Waiting                     │                           │
├─ BWC online (under tiles) ───────────────────────┤                           │
│  Start watch · Stop · Stop all · Clear           │                           │
│  Search officers…  [Online ▾]                    │                           │
│  PP / teams / pins / users                       │                           │
│  scrollbar ONLY when list overflows              │                           │
└──────────────────────────────────────────────────┴───────────────────────────┘
```

1. **Important layout** — Known Subjects use the **right side of the two title rows**, not a third squeezed toolbar. ~6 bigger chips. Live 3×2 stays. Recent stays right column.
2. **BWC online** — list grows with teams / pin icons / users. **No idle scrollbar.** Scroll appears only when content is taller than the panel.
3. **Recent** — **12 tiles, 2 columns × 6 rows.** More snaps → vertical scroll inside the rail. Do not go back to 16 fill / no-scroll.
4. **Storage (already done — not this UI MOB)** — confirmed below.

## Storage (earlier MOB — still in code)

Kept across **server restart / new browser session** on disk:

- `server.js`: `analyticsCaptureStore.init(FR_STORAGE_ROOT)` — Super Admin FR locker.
- Offline/live crops archived with `analyticsCaptureStore.saveJpeg(...)`.
- `saveCropB64` — **no** `while (files.length > 120)` wipe.
- Caps: `MAX_DURATION_SEC` 3600, `MAX_FRAMES` 100000.

Honest split:

| What | Survives new session? |
|------|------------------------|
| JPEG files under `FR_STORAGE_ROOT` / capture store | **Yes** (disk) |
| On-screen Recent / Known Subjects chips after refresh | **No** — those are a live UI buffer (`cropRailMax` / `hitsBarMax`). History is on disk; rail does not auto-replay the whole archive into the 12 slots. |

This UI MOB does **not** reload disk history into the rail. That would be a later named MOB if you want it.

## Now vs target (UI only)

| Piece | Now | Target |
|-------|-----|--------|
| Known Subjects | Inside `.ax-fr-toolbar` under nav, small strip | Right of 2-row nav, **6** larger chips |
| Recent | 2×8 = **16** fill, comment says no scroll | 2×6 = **12**, scroll if more |
| BWC wrap | `min/max-height: 210px` + always `overflow-y: auto` (empty bar) | Fit content; scroll **only when overflow** |

## One next APPLY

**`MOB-APPLY FR-UI-HEADER-KS-RECENT12-BWC-SCROLL-V1`**

Will do only:

1. Move `#ax-fr-hits-bar` into the header band (right of `.ax-hub-nav`). 6 visible chips + overflow badge. Mag stays.
2. Recent rail: 2 columns × 6 rows (12). `overflow-y: auto` when more than 12.
3. BWC roster wrap: drop fixed 210px lock; `overflow-y: auto` only when teams/users exceed the box (`overflow-y: auto` + no min-height forcing a fake scroll).
4. **Do not touch** JS firewall, `server.js` storage, sidecar, ANPR live 3-col.

## Operator pass (after APPLY)

Hard-refresh once.

- 6 Known Subject chips sit in the red-box zone beside Face/ANPR/Weapon + Live Watch row.
- Recent shows 12; extra snaps scroll.
- BWC list: no scrollbar with one small team; scrollbar appears when many teams/users.
- Live 3×2 unchanged. Offline/Live quarantine still works (untouched JS).
