# MOB DISC — ANPR Live: 8-rail compact cards (no fat detail / no confidence)

**Date:** 2026-07-31  
**Status:** DISC — **no code until** APPLY  
**Operator shot:** Fat right **detail** card (Plate / Confidence / List / Camera / When + Ack) + one lonely rail thumb — **too empty**.  
**Operator ask:** **8 rail** — picture (click / double-click expand) + **squeezed** words: plate, list, date/time, BWC. **Drop confidence** (useless).

**Supersedes layout part of:** `MOB-DISC-ANPR-LIVE-STILL-CUTOFF-ROLLING-SNAPS-20260731.md` (same genre; this is the locked UI).

---

## Problem (your shot)

| Today | Fail |
|-------|------|
| Tall detail DL | Huge empty space; labels shout; confidence wastes a row |
| Tiny 1-card rail below | Not “rolling”; looks broken |
| Giant still under live tiles | Cuts viewport (prior disc) |

Confidence on live ANPR does not help dispatch — **remove from Live UI**.

---

## Locked UI — **8-rail**

Right column = **one** rolling rail of **8** compact cards (newest first). **No** separate fat detail panel.

```text
┌─ Recent plates (8) ─────────────────────────────────┐
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐                         │
│ │img │ │img │ │img │ │img │   … up to 8             │
│ │SJA │ │…   │ │…   │ │…   │                         │
│ │list│ │    │ │    │ │    │                         │
│ │time│ │    │ │    │ │    │                         │
│ │kk  │ │    │ │    │ │    │                         │
│ └────┘ └────┘ └────┘ └────┘                         │
└─────────────────────────────────────────────────────┘
```

### Each card (squeezed — not a dossier)

| Show | Notes |
|------|--------|
| **Picture** | Plate/scene crop thumb |
| **Plate** | e.g. SJA 564 |
| **List** | No list match / Wanted / … (short) |
| **When** | Compact time (or date+time short) |
| **BWC** | Device name / location label (e.g. kk) |
| **Confidence** | **Gone** from Live |

List-hit cards keep grade colour (Suspicious / Wanted / Blacklist) on border — same as today rail `is-hit`.

### Expand picture

- **Click** or **double-click** thumb → expand (reuse FR snap lightbox pattern if present — `fr-snap-lightbox` family — plate wording, not face dossier).  
- Esc / click outside closes.  
- Expand is for **seeing the still**, not reopening the fat detail form.

### Ack

- List hits: keep **toast** + optional thin hit strip; Ack can live on toast / hit strip / expanded lightbox — **not** a permanent empty detail card taking half the column.

### Under live tiles

- Drop or shrink giant still (prior disc) so 2×2 live is the only large video.

---

## Why 8 (not 16)

Operator named **8**. Enough to feel “rolling”; fits one side column without Face’s 16-slot face density. `RAIL_MAX = 8`. Older ticks drop off the end.

---

## One MOB

### `ANPR-LIVE-8-RAIL-COMPACT-V1`

1. Remove Live fat detail panel (Plate/Conf/List/Cam/When DL) from the default right column.  
2. **8-card** dense rail; each card = img + plate + list + when + BWC; **no confidence**.  
3. Click / double-click image → expand lightbox.  
4. Kill/shrink under-tile giant still (no bottom cut).  
5. Hit toast / grade strip stay for list matches; Ack without the empty dossier.  
6. No OCR / attach / ports in this MOB.

**PASS:** Right side shows up to **8** compact cards filling space (not one thumb in a void); no confidence row; expand works; live tiles not crushed by still.

**FAIL:** Fat detail still dominates; rail still one card; confidence still shown.

---

## APPLY

```
MOB-APPLY ANPR-LIVE-8-RAIL-COMPACT-V1
```

No code in this disc.
