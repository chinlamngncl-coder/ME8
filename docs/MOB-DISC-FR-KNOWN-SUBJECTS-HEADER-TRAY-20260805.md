# MOB DISC — FR Known Subjects in header band (2026-08-05)

**Status:** disc only. No code until `MOB-APPLY FR-KNOWN-SUBJECTS-HEADER-TRAY-V1`.

## Now (problem)

Known Subjects sit inside `.ax-fr-toolbar` **below** the analytics nav, squeezed into one thin strip, fighting Live Watch / lab preview buttons.

Nav is already **two rows**:

1. Face recognition · ANPR · Weapon detection  
2. Live Watch · Load video · Verify 1:1 · Watchlist  

Empty space is **to the right of those two rows**. That is the tray we should use.

## Target (recommended)

One row of **6** Known Subject chips on the **right**, height ≈ both nav rows (a bit taller — about 4–5 small UI rows / ~72–88px chips). Horizontal scroll only if more than 6.

```
┌─ Analytics header band ──────────────────────────────────────────────────────┐
│  [ Face recognition ] [ ANPR ] [ Weapon ]          KNOWN SUBJECTS            │
│  [ Live Watch ] [ Load video ] [ Verify ] [ Watchlist ]                      │
│                                                    ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐  │
│                                                    │1 ││2 ││3 ││4 ││5 ││6 │  │
│                                                    └──┘└──┘└──┘└──┘└──┘└──┘  │
└──────────────────────────────────────────────────────────────────────────────┘
┌─ FR main (unchanged) ──────────────────────────────┬─ Recent (300px) ────────┐
│  3×2 live tiles                                    │                         │
│  BWC roster under tiles                            │                         │
└────────────────────────────────────────────────────┴─────────────────────────┘
```

Chips sit in the **same band** as the two nav rows (right side), not in a third toolbar row under the titles.

## Out of scope

- Live 3×2 grid / Recent rail / ANPR 3-col  
- Firewall, toast drag, offline video JS  
- Changing `hitsBarMax` backend cap (UI shows 6; extra stays in memory / overflow `+N`)

## APPLY (when you say go)

**`MOB-APPLY FR-KNOWN-SUBJECTS-HEADER-TRAY-V1`**

1. Move `#ax-fr-hits-bar` out of `.ax-fr-toolbar` into the header band (sibling of `.ax-hub-nav`, right-aligned).  
2. Show **6** desk chips; overflow badge if more.  
3. Chip size ~72–88px square (span the 2 nav rows, slightly bigger). Mag button stays.  
4. Do not change `.ax-fr-main` / `.ax-fr-grid` / `.ax-fr-right`.  
5. Lab preview buttons stay in toolbar (or stay hidden in popout) — not in the KS tray.

## Operator pass

Hard-refresh once. Titles left, 6 Known Subject faces right, live grid + Recent unchanged.
