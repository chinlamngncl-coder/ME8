# MOB DISC — ANPR Live: wider 16:9 tiles + slightly smaller Recent (2026-08-05)

**Status:** PASS `ANPR-LIVE-TILES-WIDER-RECENT-SLIM-V1` (operator 2026-08-05).  
**Scope:** ANPR Live 3-col chrome only. No FR, no engine, no offline match.

## Confirm: I understand

ANPR Live now:

```
[ roster ~170px ]  [ 2×2 tiles — too square ]  [ Recent Plates — a bit too wide ]
                         1fr                         1.2fr  ← Recent is larger than live
```

You want:

1. Live tiles **a bit wider** so they read as **16:9**, not square.
2. Recent Plates **a bit smaller** — not a big cut.

Roster column stays. Rest of ANPR UI stays.

## Recommendation

Nudge the split only:

- Now: `170px | 1fr | 1.2fr`
- Target: `170px | 1.35fr | 0.95fr`

Plus tile `aspect-ratio: 16 / 9` (keep 2×2). Recent cards shrink with the column — no new layout.

## One next APPLY

**`MOB-APPLY ANPR-LIVE-TILES-WIDER-RECENT-SLIM-V1`**

## Operator pass

Hard-refresh on ANPR Live.

- 2×2 tiles look wider (16:9), not square.
- Recent Plates still readable, just a bit narrower.
- Left BWC roster unchanged. Start watch still works.
