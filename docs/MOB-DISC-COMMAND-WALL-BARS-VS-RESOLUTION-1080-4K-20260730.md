# MOB DISC — Command Wall black bars vs 1080p / 4K

**Date:** 2026-07-30  
**Status:** **LOCKED FACT** — no code  
**Search:** Command Wall, letterbox, pillarbox, 1080p, 4K, object-fit contain, aspect ratio  
**Operator:** Leave contain as-is. Ask: if stream becomes **1080p or 4K**, will the **two side blacks** go away or get smaller?  
**Related:** `MOB-DISC-COMMAND-WALL-SIDE-BLACK-BARS-CONTAIN-20260730.md`

---

## Plain English

**No — not because of resolution alone.**

Black left/right come from **shape mismatch** (cell aspect vs video aspect) under **`object-fit: contain`**.  
**1080p vs 4K** is how many pixels, not the shape.

| Change | Side blacks |
|--------|-------------|
| Same aspect (e.g. still **16:9**), but 720 → **1080p** or **4K** | Bars **same size** relative to the cell — picture just **sharper** when scaled |
| Stream aspect **closer** to the wide Command Wall cell (e.g. true landscape 16:9 in a wide slot) | Bars can get **smaller** or vanish |
| Stream still **taller / portrait-ish** vs wide cell | Bars **stay** even at 4K |
| Switch fit to **`cover`** | Bars go away by **cropping** (separate MOB; operator said leave contain) |

So: **higher resolution ≠ smaller letterbox.** Matching **aspect ratio** (or changing fit policy) does.

---

## Operator expectation (locked)

- Leave Command Wall on **contain** (full frame, bars OK).  
- Do **not** promise “when we go 4K the sides disappear.”  
- If later product wants fill, use named cover MOB — not resolution marketing.

---

## Lock record

| Item | Decision |
|------|----------|
| Leave contain | **Yes** (prior turn) |
| 1080p/4K removes side blacks by itself | **False** |
| What shrinks bars | Aspect match to cell (or cover crop) |
| Code | **None** |
