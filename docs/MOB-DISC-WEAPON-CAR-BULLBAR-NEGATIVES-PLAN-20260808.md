# MOB DISC — Plan: car + bull-bar rubbish (Weapon Track B) (2026-08-08)

**Status:** disc only. No code / no retrain until you APPLY a named step.  
**Pain:** Black SUV / front metal bar (bull bar) → false **gun**. Fixed cams will see cars a lot.

---

## Plain words first — “open mag”

Not a secret feature name.

On Weapon **Recent**, each hit card has a **small magnifying-glass button**.  
**Open mag** = click that glass → big Weapon lightbox (the snap popup).  
Same idea as FR / ANPR magnify.

---

## What “car and bar” means

| Rubbish | Why it fools the model |
|---------|-------------------------|
| **Car** body / grille / dark SUV | Gun-like shapes in stills |
| **Bar** = bull bar / push bumper | Straight metal bars ≈ barrel |

Fix = **more negative training for Track B (Colab)**, not Track A smoke, not “toast settings.”

Keep A on disk until B PASS, then delete A (locked earlier).

---

## Plan (one path)

### Step 1 — You gather stills (lab)

Drop **no-weapon** JPEGs into a negatives folder for Colab B, especially:

- Cars / SUVs (day + night)  
- Bull bars / push bumpers  
- Empty garage / driveway  
- Caption / YouTube UI junk if you still see it  

Aim: dozens+, not 3 pics. Mix angles.

### Step 2 — Colab B retrain

Same Colab / Roboflow path that made `weapon_rfdetr_best.pt`.  
Add negatives → train → export new weights → replace `ai_engine/weights/weapon_rfdetr_best.pt` (+ slim sidecar if you use it).

### Step 3 — Wire / prove on 8769

Health shows Colab B. Live still with bull-bar scene → **no** Recent gun (or rare). Real gun still hits.

### Optional lab knob (band-aid only)

Slightly raise `FM_WEAPON_CONF_GUN` — does **not** replace negatives.

---

## MOB names (when you APPLY)

| Order | What you type | Who does what |
|-------|----------------|---------------|
| 1 | (no APPLY) — you collect car/bar negatives | Operator |
| 2 | You run Colab B retrain + drop new `.pt` | Operator (+ guide if you ask) |
| 3 | `MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1` | Agent: point sidecar at new weights / restart notes / prove health |
| Optional | `MOB-APPLY WEAPON-CONF-GUN-LAB-BUMP-V1` | Agent: conf bump only if still FP after B |

**Not in this plan:** Track A retrain, fake SOS, toast redesign.

---

## Also still in Weapon UI queue (separate)

| MOB | Status |
|-----|--------|
| `WEAPON-LIGHTBOX-POS-KEEP-V1` | Just applied — lightbox stays where you dragged |
| `WEAPON-TILE-CLICK-EXPAND-V1` | Next UI if you want |
| `WEAPON-ALARM-BACKUP-PTT-V1` | After toast PASS |

Car/bar = **accuracy**, not lightbox.

---

## One next step for car/bar

Start collecting **car + bull-bar** stills (no gun in frame).  
When you have a pile, say you want Colab reload help, or:

`MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1`  
(only after new weights are ready on disk)
