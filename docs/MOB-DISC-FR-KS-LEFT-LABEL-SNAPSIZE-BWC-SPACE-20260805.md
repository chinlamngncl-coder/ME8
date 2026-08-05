# MOB DISC — FR: KS label left + snap-size chips + more BWC space (2026-08-05)

**Status:** disc only. No code until you type the APPLY line below.  
**Scope:** FR Analytics chrome only. No firewall / storage / sidecar / ANPR 3-col.

## Confirm: I understand

Screenshot now: **KNOWN SUBJECTS** sits **above** the rightmost empty chips. Chips are small (~80px). Live 3×2 is tall; BWC online is a thin strip under it.

You want:

```
┌─ Header (nav left | KS right) ──────────────────────────────────────────────┐
│ [Face] [ANPR] [Weapon]                                                      │
│ [Live Watch] [Load video] …     KNOWN SUBJECTS  [1] [2] [3] [4] [5] [6]    │
│                                 words LEFT of chips                         │
│                                 chips ≈ same size as Recent snapshot tiles  │
└─────────────────────────────────────────────────────────────────────────────┘
┌─ Live 3×2 (a bit smaller, shifted up) ───────────┬─ RECENT 12 (unchanged) ─┐
│                                                  │                         │
├─ BWC online (more height) ───────────────────────┤                         │
│  Start / Stop / roster / teams                   │                         │
└──────────────────────────────────────────────────┴─────────────────────────┘
```

1. **Label** — `KNOWN SUBJECTS` on the **left of the six tiles**, same row. Not above them.
2. **Chip size** — larger; **best = same size as one Recent snapshot tile** (measure the live snap cell, copy width + height). Still 6 desk chips + overflow badge.
3. **Live vs BWC** — shrink live 3×2 a bit, shift that block up, give the freed height to **BWC online**. Recent 12 / 300px rail / firewall / storage stay as they are.

Honest limit: six snap-sized chips + label must still fit beside the two nav rows. If the window is too narrow, chips stay snap-sized and the KS row may scroll sideways — we will not wrap to a second chip row or crush the nav.

## Now vs target

| Piece | Now | Target |
|-------|-----|--------|
| KS title | Above chips, right-aligned | Left of chips, one row |
| KS chip size | Fixed 80×80 | Match Recent snap cell |
| Live 3×2 | Takes most leftover height | A bit shorter, higher |
| BWC online | Thin under tiles | Taller — more roster room |

## One next APPLY

**`MOB-APPLY FR-KS-LEFT-LABEL-SNAPSIZE-BWC-SPACE-V1`**

Will do only:

1. Hits bar = one horizontal row: title (+ overflow) **then** 6 chips.
2. Size KS chips from the real Recent snap cell (`syncHitsChipSizeToSnap` — stop forcing 80×80).
3. Cap live grid height a bit; raise BWC roster wrap max-height so BWC gets the space.
4. **Do not touch** firewall JS, storage, sidecar, ANPR live layout, Recent 12 count.

## Operator pass (after APPLY)

Hard-refresh once.

- Words **KNOWN SUBJECTS** sit left of the six tiles.
- Those six tiles look about the same size as one Recent snapshot.
- Live tiles a bit smaller / higher; BWC online has more room.
- Recent still 12 (2×6). Offline/Live split still works.
