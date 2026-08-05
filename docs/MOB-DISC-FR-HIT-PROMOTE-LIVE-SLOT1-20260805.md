# MOB DISC — FR live hit → slot 1 (2026-08-05)

**Status:** APPLIED `FR-HIT-PROMOTE-LIVE-SLOT1-V1` (2026-08-05).  
**After:** FR UI chrome PASS (KS header, Recent 12, BWC 5×6, offline isolate, thin chrome).

## Where we are (locked this genre)

- Live 3×2 + Recent 12 (scroll after 12) + KS in header.
- BWC online: 5×6 levels, groups roll right, thin-line chrome.
- Offline vs live snaps / alerts isolated. Offline Play / Pause / Stop / scrub.
- Disk keep: `fr/{date}/{user}/{bwc}/` — on-screen rails still do **not** reload after refresh.
- Ops map live popup + Alert-field beep burst: unchanged (not non-stop).

## This next MOB

During **Live Watch polling**, if a hit lands (Recent / alert — not offline video):

- Put that BWC on **top-left live tile (slot 1)**.
- Even if it was off-screen in the rotate pool, or on another tile — move/swap it to slot 1.
- **Pin** it so the next 20s rotate does not kick it off immediately.
- Ops map popup path stays as today.

```
Hit on cam X (maybe hidden in poll)
        ↓
Tile 1 shows X live   [2][3]
                      [4][5][6]
```

## Out of this MOB

- Reload disk history into the 12 Recent tiles.
- Non-stop field tone.
- ANPR.

## One next APPLY

**`MOB-APPLY FR-HIT-PROMOTE-LIVE-SLOT1-V1`**

## Operator pass (after APPLY)

Hard-refresh. Start watch with more than 6 BWCs. When a known-subject hit fires on a cam that is not on tile 1 (or not on screen), that cam appears on **slot 1** and stays through the next poll tick.
