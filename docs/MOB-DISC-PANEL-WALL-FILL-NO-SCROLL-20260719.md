# MOB DISC — Panel Wall fill without scroll (NO APPLY)

**Status:** DISC only — 2026-07-19 · **no code until named MOB-APPLY**  
**Subject:** `MOB-DISC-PANEL-WALL-FILL-NO-SCROLL`  
**Follows:** `MOB-APPLY-PANEL-WALL-DYNAMIC-RATIO` (applied) + operator feedback  
**Scope:** Ops right `#video-wall` only — not pin, not SOS/PTT, not Command Wall unless named later

---

## What you mean (confirmed)

1. **No scrolling** on the right rail — all panels stay in the original equal-height stack (fill the rail like before).
2. **No black bars on both sides** (letterbox left/right) — picture should **fill the panel**.
3. **Look bigger / “better resolution”** on the panel = use the full slot pixels (not a small 16:9 island inside a tall/short box).
4. Dynamic `aspect-ratio: 16/9` on each stage was the wrong trade for Ops: it made geometry “correct” but forced **scroll** when 6×16:9 exceeded the rail. That feels dumb for a fixed operator wall.

Yes — that reading matches.

---

## Why the conflict exists

| Constraint | Reality |
|------------|---------|
| Camera / ZLM | Usually **16:9** (HD/4K) |
| Ops rail | Fixed **~272px** wide; height = **viewport**; **6** equal `flex:1` slots |
| Slot stage AR | **Not** 16:9 — usually **wider than 16:9** (short height) on a normal Ops window |

You cannot have all three at once without compromise:

1. Exact 16:9 stage boxes  
2. Six panels, no scroll, fill the rail  
3. Show 100% of the frame with no crop  

`MOB-APPLY-PANEL-WALL-DYNAMIC-RATIO` chose (1) → lost (2).  
You want (2) + fill → must drop exact full-frame (3) or accept letterbox.

---

## Recommended direction (DISC)

### A — Revert panel geometry to original (no scroll)

Undo the dynamic-ratio layout pieces:

- Restore `#video-wall .video-slot` / `.video-slot-box` / `.video-slot-stage` to **fluid `flex:1`** (equal share of rail height).
- Restore `#video-wall-slots` to **`overflow: hidden`** (no scroll).
- Remove stage `aspect-ratio: 16/9` and `height: auto` lock.

Wall chrome / play / stop / SOS / PTT / ZLM mount path: **untouched**.

### B — Fill the fluid box: `object-fit: cover`

On ZLM overlay (and matching CSS for panel stage video/canvas):

- Keep absolute `width/height: 100%`.
- Switch **`object-fit: contain` → `object-fit: cover`** for **panel wall hosts only** (or globally if pin already has its own box — prefer **panel-only** if pin must stay letterboxed).

**Effect on typical Ops slots (wider than 16:9):**

- Video scales until the stage is full.
- Crop is mostly **top + bottom** (not left/right) — kills “both side black”.
- Picture uses the **full panel** → looks larger / sharper on that small rail (same stream pixels, more screen area used).

**Cost:** edges of the frame are cropped (usually top/bottom of the 16:9 picture). Center stays.

### C — Not recommended for this ask

| Idea | Why not |
|------|---------|
| Keep 16:9 stages + scroll | You rejected scroll |
| Keep 16:9 + shrink to fit 6 without scroll | Dead empty space under stack; panels tiny |
| `contain` + fluid stages | Brings back side (or top/bottom) black bars |
| Widen rail a lot | Helps a little; still not true 16:9 × 6 in one viewport; changes map layout |

---

## Optional later (not this MOB)

- **Inner 16:9 frame** inside fluid stage + `contain` = explicit letterbox, still blacks, no crop — opposite of fill.
- **Fewer slots** or page of panels = true 16:9 no crop no scroll — product change.
- Command Wall same policy — separate APPLY.

---

## Proposed next APPLY (name when you want code)

**`MOB-APPLY-PANEL-WALL-FILL-NO-SCROLL`**

1. Revert `MOB-APPLY-PANEL-WALL-DYNAMIC-RATIO` **layout** (fluid slots, no AR, no scroll).  
2. Panel wall ZLM/`<video>` (+ canvas if needed): **`object-fit: cover`**.  
3. Prefer scope to `#video-wall` / panel stage so pin mirror policy stays whatever you already locked.  
4. Cache-bust factory (+ CSS via hard refresh).  
5. Do **not** touch play/stop/SOS/PTT logic.

---

## Operator check after APPLY

Hard refresh Ops → six panels fill rail **without scroll** → live picture **fills** the black box (no left/right bars) → crop top/bottom acceptable? Pass/fail.

---

## Status

**DISC only.** Waiting for **`MOB-APPLY-PANEL-WALL-FILL-NO-SCROLL`** (or your exact APPLY name) before any edit.
