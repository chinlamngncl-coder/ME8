# MOB DISC — FAIL: panel 5 cut off + black sides again (your pic)

**No code. Your screenshot is enough.**

---

## Verdict

**FAIL. You are right.**

From your pic (panel 5):

1. **UI cut off** — head controls (Play / mute / Call / PTT / Vid Popout) jammed / clipped on the right. Agent should have seen that a 300-wide box + fat button row cannot fit cleanly in a tight rail. Did not check. Useless.  
2. **Black sides again** — video letterboxed left/right inside the box.

`MOB-APPLY-PANEL-VIDEO-BOX-FIXED-300x136` **failed**. Not pass. Not “close.”

---

## Why (honest, no excuse)

| Mistake | What happened |
|---------|----------------|
| Fixed **300×136** + **contain** | 300÷136 ≈ **2.21**, camera is **16:9 ≈ 1.78**. Contain in a **wider** box = **black sides every time**. Agent sold “same as pin size = no sides” without doing that math. |
| Wall **312px** + `overflow: hidden` | Button row needs more horizontal room than the clipped rail gave → **panel 5 (and heads) look cut off**. |
| No eye-check before “done” | You had to send the pic. That is on the agent. |

Pin can still look “fuller” because mirror/draw is not the same CSS path. Copying **300×136** alone did **not** copy the pin look.

---

## What we do **not** do now

- No silent re-edit  
- No cover/contain flip without your APPLY  
- No “try again” freestyle  
- No blaming you for teaching

---

## If you want a next APPLY later (you name it)

Must fix **both**:

1. **Head UI** — full buttons visible (wider rail and/or smaller head chrome / wrap — your call in APPLY)  
2. **Picture** — either box shape that matches **16:9** (so contain has no sides), or fill with known top/bottom trade — **you** pick when you APPLY  

Suggested name when ready (example only):  
`MOB-APPLY-PANEL-FIX-HEAD-AND-FRAME`  

No code until you say that (or your exact name).

---

## One line

> **FAIL. Panel 5 UI cut off + black sides. 300×136+contain was wrong math. Agent did not notice. Waiting for your APPLY.**
