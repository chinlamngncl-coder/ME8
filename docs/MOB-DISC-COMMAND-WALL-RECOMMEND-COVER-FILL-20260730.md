# MOB DISC — Command Wall look: recommend cover fill (with argument)

**Date:** 2026-07-30  
**Status:** **APPLIED** via `COMMAND-WALL-FILL-COVER-V1` (2026-07-30) — awaiting operator PASS  
**Search:** Command Wall fill, cover, contain, strange black sides, COMMAND-WALL-FILL-COVER  
**Operator:** Leave was wrong feel — “looks very strange”; thinks we should fix. Wants agent argument + MOB disc.  
**Related:** `MOB-DISC-COMMAND-WALL-FILL-COVER-V1-APPLIED.md` · `MOB-DISC-COMMAND-WALL-SIDE-BLACK-BARS-CONTAIN-20260730.md` · `MOB-DISC-PANEL-COVER-VS-PIN-FAIL-20260719.md`

---

## Recommendation (one path)

**Do it — Command Wall only: `object-fit: cover`.**

Named MOB: **`COMMAND-WALL-FILL-COVER-V1`**

Command Wall is a **watch wall**, not an evidence crop tool. Operators expect each cell **filled** like a TV mosaic. Tall black pillars on Chin/kk read as broken, not “correct AR.” Accept a little **edge crop** so the cell looks like a normal live panel.

---

## Argument for cover (why this wins)

| Point | Why |
|-------|-----|
| Product face | CW is “big screen live” — empty side columns look unfinished |
| Resolution myth | 1080p/4K won’t remove bars; waiting on pixels never fixes the strange look |
| Scope | CW cells only — leave map pin / Ops rail / VC alone unless they already use their own rules |
| Risk | Low CSS/player style change; reverse = put `contain` back |
| Prior Ops note | Ops **cover** once felt wrong vs pin (crop fight). That was **Ops rail vs pin parity**. CW is a **different job** — mosaic fill beats pin-match |

---

## Argument against (honest)

| Point | Why it matters |
|-------|----------------|
| Crop | Top/bottom (or sides) of the BWC frame can be cut — face/chest at edge might clip |
| Investigation | If you need **100% of the frame** on CW, contain is safer; use fullscreen / pop-out for full frame |
| Past FAIL | Ops panel `cover` vs pin was rejected for parity — don’t blindly copy that fight onto pin |

**Still recommend cover for CW** because the operator already called contain “very strange,” and CW is not the pin.

---

## Rejected alternatives

| Option | Why not |
|--------|---------|
| Stretch (`fill` / no contain) | Distorts — worse than bars |
| Wait for 4K | Does not fix AR mismatch |
| Rebuild cell to exact stream AR | Hard with multi-scheme grid (2×2, 3×3, focus); bars return on other schemes |
| Change Ops + pin + CW in one MOB | Bundle risk — **CW only** this MOB |

---

## APPLY scope (`COMMAND-WALL-FILL-COVER-V1`)

| # | Change |
|---|--------|
| 1 | `#app-view-command-wall .cw-cell-stage video.me8-zlm-primary` → **`object-fit: cover`** |
| 2 | If factory inline style forces `contain` on CW hosts, override for Command Wall stage only |
| 3 | Cache-bust CW / CSS as needed |
| 4 | **Do not** change map pin, Ops `#video-wall`, Analytics FR tiles, VC in this MOB |

**PASS:** Chin/kk (and other CW cells) fill the stage edge-to-edge — no tall side blacks. Slight crop OK.  
**FAIL:** Distorted stretch, or pin/Ops regress.

---

## Operator decide

When ready:

- **`MOB-APPLY COMMAND-WALL-FILL-COVER-V1`**

**No code in this disc.**

---

## Lock record

| Item | Decision |
|------|----------|
| Agent recommendation | **Cover fill on Command Wall** |
| Wait for resolution | **Rejected** |
| Stretch | **Rejected** |
| MOB | **`COMMAND-WALL-FILL-COVER-V1` APPLIED** |
