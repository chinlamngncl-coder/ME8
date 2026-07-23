# MOB DISC — Redact “±1s around here” — what it means (plain English)

**Date:** 2026-07-23  
**Status:** PAPER — explain only (no APPLY; behaviour already in product)  
**UI:** Evidence → Redact → **New area covers** dropdown  
**Options:** Whole clip · From here to end · **±1s around here**

---

## One sentence

**±1s around here** = when you **draw a blur box**, that box only blurs for about **two seconds**: one second **before** the playhead and one second **after** — not the whole video.

---

## How you use it (yes: play / scrub first)

| Step | What you do |
|------|-------------|
| 1 | Play or scrub so the **playhead** is on the moment you care about (e.g. the clear face flashes). |
| 2 | Set **New area covers** → **±1s around here**. |
| 3 | Pause if you like (optional) — what matters is **current time** when you finish the draw. |
| 4 | Drag a box on the picture. |

**On mouse-up**, the app reads `video.currentTime` (= “here”) and sets:

- start = here − 1 second (not before 0)  
- end = here + 1 second (not past clip end)

So the box is **time-limited** to that short window. It does **not** mean “select 1 second of playback” as a separate tool — the selection is the **draw**, and the dropdown only sets **how long that draw stays blurred**.

---

## All three options (same draw action)

| Choice | Blur lasts |
|--------|------------|
| **Whole clip** | From 0 to end of file |
| **From here to end** | From playhead → end of file |
| **±1s around here** | Playhead − 1s → playhead + 1s (~2s total) |

“Here” = playhead at the moment you **finish drawing** the box.

---

## When ±1s is useful

- One brief clear face / plate in an otherwise OK clip  
- You don’t want that manual box blotting the person for the **entire** recording  

When it’s **not** enough: face stays longer than ~2s — use **From here to end**, **Whole clip**, or draw again / edit Start–End on the region row (manual boxes show time fields).

---

## Auto yellow boxes

Auto preview rows are **not** driven by this dropdown the same way (sample times from detect). This control is for **manual** drag boxes.

---

## One line

**Play/scrub to the moment → pick ±1s → draw the box; blur only covers about one second before and after that playhead time.**
