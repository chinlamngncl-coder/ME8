# MOB DISC — ANPR Live: still cut off + missing rolling snapshots

**Date:** 2026-07-31  
**Status:** DISC — **no code until** APPLY  
**Operator:** Attach parity **good**. New fail: big panel under the 4 tiles is **cut at the bottom**; expected **lots of rolling snapshots** (like Face). Right side shows ~**one** thumb.

---

## What you are looking at (not the live tile)

| Area | What it is today |
|------|------------------|
| Top 2×2 | **Live tiles** (FLV) — idle in your shot (`0/4 live`, kk = Rotate) |
| Big panel under tiles | **Last detection still** (`#ax-anpr-live-still`) — full grab / last plate frame, **not** a second live player |
| Right column | Detail card + tiny **rail** (`#ax-anpr-live-rail`, `RAIL_MAX=12`) |

The cut-off “live video below” is that **still panel**. It was built oversized (`min-height` + `max-height: 280px` on the img, but still eats the column and clips at the viewport). Empty hint text can also fight the image. That is layout fail — not ZLM.

---

## Where are the rolling snapshots?

**Face Live:** right column = dense **crop rail** (`ax-fr-crop-rail` + `ax-fr-crop-list`) — ~**16** recent face snaps in a **2×8 grid**, fills the column, **no** giant still under the tiles.

**ANPR Live today (half of the design disc):**

1. Giant **last still** under tiles (industry “detection still” idea)  
2. Right rail = small flex-wrap cards, **`max-height: 200px`**, overflow auto  
3. Rail only updates when `anpr-crop-tick` / list-hit fires (`pushRail`)  
4. Same-plate dedupe (`FM_ANPR_READ_DEDUPE_MS` ~8s) → few cards if the same plate stays in frame  

So: rolling snaps **exist in code**, but they are **not** the FR-style dense rail operators expect. One thumb + a cut still = product feels empty.

Design lock already said both still **and** recent plate rail (`MOB-DISC-ANPR-LIVE-UI-DESIGN-FR-PARITY-20260731.md`). Ship put the still too big and the rail too weak.

---

## Locked product answer

Unify with **Face** for the **history column**; keep ANPR alert still **small**, not a second full-bleed video:

```text
┌──────── roster ────────┬──────── live 2×2 tiles ────────┬── Recent plates (dense) ──┐
│ Start / Stop / Stop all│  FLV tiles only                │  title: Recent plates      │
│                        │  (no giant still under)        │  FR-like grid ~12–16 crops │
│                        │  optional thin hit strip       │  plate · cam · time         │
│                        │                                │  detail + Ack above/beside │
└────────────────────────┴────────────────────────────────┴────────────────────────────┘
```

| Keep | Change |
|------|--------|
| 4 live tiles + roster + Start/Stop/Stop all | Remove or shrink under-tile still so it does not eat/cut the viewport |
| List-hit toast / grade bar | Last read = **thumb in rail** + detail card (not full-frame under tiles) |
| Poller ticks → rail | Rail = FR-parity density + title; fill side column height |
| Concurrent Face + ANPR | Untouched |

**Not in this MOB:** OCR engine, ports, attach parity (already APPLIED).

---

## One MOB

### `ANPR-LIVE-SNAP-RAIL-LAYOUT-FR-PARITY-V1`

1. **Layout:** Drop giant under-tile still (or replace with compact last-crop strip max ~96–120px). Stop bottom clip.  
2. **Rail:** FR-style **Recent plates** grid (title + multi-row thumbs), ~12–16 slots, column fills height like `ax-fr-crop-rail`.  
3. **Wire:** Every crop tick / hit still `pushRail` + detail; empty state hint on rail, not a fake full-frame player.  
4. **CSS:** Prefer `global.css` / existing ANPR block — no new white skin.  
5. Cache-bust ANPR live JS/HTML as needed.

**PASS:** After Start watch + plate in view, side shows a **growing** strip of plate snaps (not one lonely card); nothing cut off under the live tiles; live tiles remain the only large video.

**FAIL:** Giant still still clips; rail stays one card with empty dark void; layout looks nothing like Face’s recent snaps.

---

## APPLY

```
MOB-APPLY ANPR-LIVE-SNAP-RAIL-LAYOUT-FR-PARITY-V1
```

No code in this disc.
