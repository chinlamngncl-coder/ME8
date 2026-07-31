# MOB DISC — Command Wall side black bars (contain vs fill)

**Date:** 2026-07-30  
**Status:** **FACT** — no code until APPLY  
**Search:** Command Wall, cw-cell-stage, object-fit contain, letterbox, pillarbox, black bars  
**Operator:** Chin / kk live on Command Wall show **black left + right**. Was it always like this, or did something change?  
**Related:** `MOB-DISC-PANEL-WALL-FILL-NO-SCROLL-20260719.md` · `MOB-DISC-WALL-PANEL-ASPECT-RATIO-GOOGLE-20260719.md` · `MOB-APPLIED-COMMAND-WALL-FLV-HANDOFF-V1-20260720.md`

---

## Plain English

1. **What you see is expected with current fit policy**, not a broken stream. The picture is keeping its real shape; empty space is painted black.  
2. **Not caused by today’s Analytics / engine-health / offline-hit APPLYs** — those did not touch Command Wall video CSS or the FLV player.  
3. **Command Wall cells are wide landscape boxes.** BWC / ZLM frames are often **taller relative to that box** (or not matching the cell AR). With **`object-fit: contain`**, the video sits in the middle → **black on both sides** (pillarbox).  
4. **Ops panel wall** already had this debate (2026-07-19): fill the box = **`cover`** (crop edges) **or** keep full frame = **`contain`** (bars). Command Wall was **not** switched to fill in that work (“not Command Wall unless named later”).

---

## Code fact (today)

```text
#app-view-command-wall .cw-cell-stage video.me8-zlm-primary {
  … object-fit: contain; background: #000; …
}
```

Also `live-player-factory.js` paints ZLM video with **`object-fit:contain`**.

So Command Wall **intentionally** letterboxes/pillarboxes rather than stretch or crop.

---

## Day‑1 vs changes (honest)

| Era | Fit behavior |
|-----|----------------|
| Pre–FLV / canvas stretch | Could **fill** the cell by stretching (wrong AR / soft look) — felt “full” but not true contain |
| Contain / pin-stop / FLV handoff path | **Correct AR** + black bars when cell ≠ stream AR |
| `COMMAND-WALL-FLV-HANDOFF-V1` (2026-07-20) | Live path → FLV; **kept contain** |
| Ops `#video-wall` fill discs (2026-07-19) | Discussed **cover** to kill side bars on **Ops panels** — **Command Wall left on contain** unless a later named MOB |

So: **side blacks are not a brand-new surprise from this week.** They became the **normal** look once we stopped stretching and used **contain**. If memory of “day 1” was a filled cell, that was likely **stretch/cover**, not today’s contain.

---

## Trade-off (locked math)

| Want | Cost |
|------|------|
| Full frame, no crop, correct shape | Black bars (what you see) |
| Fill cell, no side blacks | **`object-fit: cover`** — crops top/bottom (or sides) |
| Stretch to fill | Distorted picture — **reject** |

Cannot have fill + no crop + wrong cell AR at once.

---

## Recommended next (only if operator wants fill)

### `COMMAND-WALL-FILL-COVER-V1`

Switch Command Wall stage video (and matching factory style for CW hosts only) from **`contain` → `cover`**.  
PASS = Chin/kk cells filled edge-to-edge; slight crop OK.  
**Do not** change Ops pin / map / VC unless named.

If operator prefers **keep full BWC frame** → **no MOB** — bars stay by design.

---

## Operator decide

- **Accept contain** (full frame, side blacks) → no APPLY  
- Want fill: **`MOB-APPLY COMMAND-WALL-FILL-COVER-V1`**

**No code in this disc.**

---

## Lock record

| Item | Decision |
|------|----------|
| Side blacks on CW with contain | **Expected**, not stream failure |
| Caused by today’s Analytics MOBs | **No** |
| Day‑1 “filled” memory | Likely old stretch/fill; current policy is contain |
| Fill without bars | Needs **cover** MOB on Command Wall only |
