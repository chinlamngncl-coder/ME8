# MOB DISC — ANPR Live rail: 4×4 equal + smaller live + row-by-row move

**Date:** 2026-07-31  
**Status:** DISC — **no code until** named APPLY  
**Operator FAIL / clarify:** Previous compact APPLY (`ANPR-LIVE-COMPACT-TILES-16-RAIL-V1`) picked **2×8** and capped live oddly. Operator intent was simpler and was **not** followed.

**Not this chat:** China zip / 83 MB / Docker honesty. That was a different topic. This disc is **Live tiles + Recent plates rail only**.

---

## Operator instruction (plain — lock this)

1. **Scale the 4 live tiles smaller** than the viewport-lock PASS size (still **exactly 4** cams, still fully on screen — no cut-off).  
2. **Rails = 4×4** (sixteen **equal** cells). Not 2×8 tall strips. Equal width, equal height.  
3. When a **snapshot** comes in, the rail **moves** — cards advance **row by row** (left → right along a row, then next row). Oldest falls off after 16.

That is the whole product ask. No China pack. No inventing a third layout.

---

## What went wrong (agent)

| Operator meant | Agent did |
|----------------|-----------|
| **4×4** equal rail cells | Chose **2×8** “first” from an optional note in the old disc |
| Live **smaller** than before, still clear | Capped ~46% / max-width in a way that felt wrong / not “just scale down” |
| New snaps **rotate / shift** along the rail | Only `unshift` into a list — grid shape wrong, no clear **row-by-row** motion |

Agent over-thought “2×8 for vehicle thumbs.” Operator already said **4×4**. That wins.

---

## Locked layout (one path)

```text
┌──────────┬──────────────────┬──────────────────────────┐
│  roster  │  2×2 live        │  Recent plates           │
│          │  (smaller than   │  ┌──┬──┬──┬──┐           │
│          │   viewport-lock) │  │1 │2 │3 │4 │  row 1    │
│          │                  │  ├──┼──┼──┼──┤           │
│          │                  │  │5 │6 │7 │8 │  row 2    │
│          │                  │  ├──┼──┼──┼──┤           │
│          │                  │  │ … equal cells … │     │
│          │                  │  └──┴──┴──┴──┘  4×4      │
└──────────┴──────────────────┴──────────────────────────┘
```

| Piece | Spec |
|-------|------|
| Live | Still **4**. **Visibly smaller** than `ANPR-LIVE-TILES-VIEWPORT-LOCK-V1` PASS. Keep viewport lock (no `aspect-ratio` that cuts slots 3–4). |
| Rail grid | CSS **`grid-template-columns: repeat(4, 1fr)`** + **`grid-template-rows: repeat(4, 1fr)`** — **equal** cells |
| Count | `RAIL_MAX = 16` (already) |
| Fill order | Index **0 = top-left** (newest). Then **1,2,3** across row 1; **4–7** row 2; … **15** bottom-right (oldest). |
| On new snap | Insert newest at **0**; previous cards **shift one step** in that order (row-major). Drop past 16. |
| Motion | Prefer a **short** shift (CSS / class) so the eye sees the row move — not a frozen redraw that looks random. Keep it simple; no carousel of whole pages. |
| Card chrome | Tight; scene thumb + one plate line; **equal** cell chrome so 4×4 reads as one board |
| Viewport | Live + **all 16** cells on screen — no page scroll for the matrix/rail |

**Not in next MOB:** China zip, Docker, PiP, whole-vehicle crop engine, changing live from 4→8 streams.

---

## Row-by-row (so nobody “misunderstands” again)

```text
Before:  [A][B][C][D]
         [E][F][G][H]
         ...

New snap N arrives:

After:   [N][A][B][C]
         [D][E][F][G]
         ...
         (last cell drops off)
```

Same as today’s `unshift` + slice(16), but the **grid must be 4×4** so that shift **reads as row-by-row**, not a tall 2-column stack.

---

## Proposed APPLY (when ordered)

`ANPR-LIVE-RAIL-4X4-EQUAL-V1`

**PASS:** Four **smaller** live tiles fully visible; **4×4** equal rail cells fully visible; new snap lands top-left and older cards **move along the row then down**; no cut-off.  
**FAIL:** Still 2×8; unequal cells; live still huge; rail clipped; or snaps jump with no clear order.

---

## Lock

- Operator: **4×4 equal rails + smaller live + row-by-row shift.**  
- Previous compact MOB’s **2×8 pick is superseded** by this disc (layout only).  
- **No code** until: `MOB-APPLY ANPR-LIVE-RAIL-4X4-EQUAL-V1`
