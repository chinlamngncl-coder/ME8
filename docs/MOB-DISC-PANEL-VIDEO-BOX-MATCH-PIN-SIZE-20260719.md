# MOB DISC — Panel video box same size as pin · can we? (NO APPLY)

**No code. Talk only.**

---

## Understand? (yes)

You want:

1. The **video box only** on the wall panel = **same size as the pin video box**  
2. Not talking about stuffing “Live / buttons” *into* the video, or telemetry *inside* the video  
3. Top bar / buttons can stay **above** the box; name/telemetry **below** the box — outside  
4. If the wall needs to be a bit wider, **shift the panel column a little left** so the map gives space  
5. Goal: same box shape → same picture as pin (full frame, no weird sides/crop fight)

Got it.

---

## Pin video box today (fact)

In CSS, pin media box is about:

- **Height: 136px**  
- **Width:** about **300px** (popup `min-width: min(300px, …)`)

Wall rail today is **272px** wide — a bit narrower than the pin video width.

---

## Can we do it?

**Yes.**

Not magic. Layout change on the **Ops wall only**:

| Piece | Idea |
|-------|------|
| `.video-slot-stage` (video box only) | Lock to **same as pin** ≈ **300×136** (or width 100% of a ~300px rail × height 136) |
| Fit inside that box | **contain** (full frame like pin) — box already pin-shaped, so sides/crop fight goes away |
| Slot head (Live, Play, Call, PTT…) | Stay **above** the video box |
| Caption / telemetry under | Stay **below** the video box — **not** inside the picture |
| `#video-wall` width | Widen ~272 → ~**300–312** so a 300-wide video fits |
| Room | Shift wall **left** a little (map loses a few px) — you already allow that |
| Bank B size / blank under | Keep your rule unless you say change |
| Pin / Call / PTT / SOS logic | **Do not touch** for this MOB |

---

## What this does **not** mean

- Not deleting Play/Call/PTT (they stay on the head row above)  
- Not changing pin code / Firmware Gold mirror  
- Not “cover again” as the main trick — **same box size** is the trick  
- Not showing all 8 at once without tabs  

---

## Risk to say out loud

Five panels × (head + **136px video** + caption) needs enough window height.  
On a short screen, the stack may get tight (no scroll preferred). We size carefully and you pass/fail after APPLY.

---

## Suggested APPLY name (when you want code)

`MOB-APPLY-PANEL-VIDEO-BOX-MATCH-PIN-SIZE`

Scope:

1. Wall **stage** size = pin video box (~300×136)  
2. Widen wall + slight shift left  
3. Full-frame fit inside that box  
4. Head above / telemetry below only  
5. No pin / no voice / no SOS freestyle  

---

## One line

> **Yes — understood. Same video box as pin (~300×136), chrome outside, wall a bit wider/left. Can do. No code until you APPLY that name.**
