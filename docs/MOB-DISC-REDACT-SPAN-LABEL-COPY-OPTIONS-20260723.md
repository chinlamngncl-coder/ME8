# MOB DISC — Redact span dropdown: clearer words (options to pick)

**Date:** 2026-07-23  
**Status:** APPLIED 2026-07-23 — Package **F** via `MOB-APPLY REDACT-SPAN-LABEL-COPY-V1`  
**See:** `docs/MOB-APPLIED-REDACT-SPAN-LABEL-COPY-V1-20260723.md`  
**Problem:** Current copy is vague/clumsy. Operators hear “±1s around here” and think it is a **video trim / select-1-second** tool. It is not.  
**Truth (locked behaviour):** You still **draw a box**. The dropdown only sets **how long in time that box stays blurred**.

---

## What is wrong today

| Current string | Why it misleads |
|----------------|-----------------|
| **New area covers** | “Covers” what — the picture? the file? the timeline? |
| **Whole clip** | OK, but pairs poorly with “covers” |
| **From here to end** | “Here” is unspoken = playhead when you finish the draw |
| **±1s around here** | Sounds like a scrub/select tool; “±1s” is engineer shorthand |

**One-sentence truth for any new copy:**  
*After you draw a blur box, this choice sets how long that blur stays on the timeline.*

---

## Naming packages (pick one family)

Each package = **label** + **three options** + optional **one-line hint** under the control.  
Hint is recommended for ship; label alone is rarely enough.

### Package A — “Blur lasts” (plain, agent lean)

| Role | Text |
|------|------|
| Label | **Blur lasts** |
| Opt 1 | **Whole clip** |
| Opt 2 | **From playhead to end** |
| Opt 3 | **About 2 seconds around playhead** |
| Hint | *Sets how long your drawn box stays blurred — not a clip trim.* |

**Pros:** Short label; Opt 3 says duration in plain English.  
**Cons:** “About 2 seconds” hides the ±1s math (still accurate enough).

---

### Package B — “This box blurs for” (most explicit)

| Role | Text |
|------|------|
| Label | **This box blurs for** |
| Opt 1 | **The whole clip** |
| Opt 2 | **From now to the end** |
| Opt 3 | **1 second before and after now** |
| Hint | *“Now” = where the playhead is when you finish drawing.* |

**Pros:** Hard to confuse with trim/select.  
**Cons:** Label a bit long; “now” needs the hint.

---

### Package C — “Time range for this box”

| Role | Text |
|------|------|
| Label | **Time range for this box** |
| Opt 1 | **Entire clip** |
| Opt 2 | **Playhead → end** |
| Opt 3 | **Playhead ± 1 second** |
| Hint | *Draw the box after scrubbing to the moment. This is not a separate select-time tool.* |

**Pros:** “This box” ties draw + time.  
**Cons:** “±” still a bit techy; arrow may look odd in some locales.

---

### Package D — Verb first (“When I draw…”)

| Role | Text |
|------|------|
| Label | **When I draw a box, blur** |
| Opt 1 | **for the whole clip** |
| Opt 2 | **from the playhead to the end** |
| Opt 3 | **only ~2 seconds around the playhead** |
| Hint | *(none needed if space is tight — sentence is self-explaining)* |

**Pros:** Reads as one English sentence with the dropdown.  
**Cons:** Long label; awkward if UI wraps badly.

---

### Package E — Short ops / radio-desk

| Role | Text |
|------|------|
| Label | **Manual blur time** |
| Opt 1 | **Full clip** |
| Opt 2 | **Rest of clip** |
| Opt 3 | **±1 s at playhead** |
| Hint | *How long the box you draw stays blurred.* |

**Pros:** Compact for dense redact chrome.  
**Cons:** “Rest of clip” and “±1 s” still need one hint pass for new users.

---

### Package F — Avoid “playhead” word (non-tech operators)

| Role | Text |
|------|------|
| Label | **Blur this box** |
| Opt 1 | **On the whole video** |
| Opt 2 | **From this moment to the end** |
| Opt 3 | **Only around this moment (~2 s)** |
| Hint | *Scrub to the face first, then draw. Dropdown = how long the blur stays — not cutting the file.* |

**Pros:** No “playhead”; matches “operator is not tech.”  
**Cons:** “This moment” must equal scrub position when draw finishes (hint carries that).

---

## What we are **not** renaming in this MOB

- Start / End fields on an existing region row (those already mean timeline).  
- Auto yellow-box detect (not driven by this dropdown).  
- Behaviour of ±1s window (still playhead −1s → +1s unless a later MOB changes the window size).

---

## Agent recommendation (one pick)

**Package F** for ship UI (operators), with the short hint.

Reason: drops engineer words (“covers”, “±1s”, “playhead”), states **box + duration**, and the hint kills the trim/select confusion in one line.

If the redact bar is too narrow for Package F’s Opt 3 length, fall back to **Package A** (same meaning, shorter options).

**Do not** keep “New area covers” / “±1s around here” as the long-term face — they caused this confusion.

---

## APPLY when you choose

Reply with the package letter (or a mix, e.g. “F label + A options”), then:

`MOB-APPLY REDACT-SPAN-LABEL-COPY-V1`

Touches: `public/locales/en.json` (+ other locales if present), `evidence-hub.js` only if keys change shape; cache bust. No blur math change.

---

## One line

**Dropdown = how long the drawn blur stays; pick a naming package — recommended F (or A if space is tight).**
