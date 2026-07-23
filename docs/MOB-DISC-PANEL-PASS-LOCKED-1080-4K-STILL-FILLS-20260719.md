# MOB DISC — PASS locked · 1080p / 4K still fill? (NO TOUCH)

**No code. Do not touch.**  
**Operator:** Pass. Leave it. Will 1080p / 4K still fill in nicely?

---

## Locked

| Item | Status |
|------|--------|
| Current panel look (fill-width, fit five, no empty side gaps) | **PASS — leave it** |
| Agent edits to panel wall fit | **Forbidden** until a new named FAIL + APPLY |
| Pin / Call / PTT / SOS | Untouched |

---

## Will 1080p / 4K still fill nicely?

**Yes — that is how this PASS path is built.**

| Piece | What it does |
|-------|----------------|
| Stream pixels (720 / 1080 / 4K) | Cam sends more or fewer pixels — **sharpness** changes |
| Panel **box** | Sized by **rail + fit-five + aspect** (shape), not “must be 720” |
| `object-fit: contain` | Scales **whatever** resolution into that box — full frame, no stretch-to-death |
| AR from live video when known | If stream is 16:9 (typical), box follows; layout re-fits on metadata |

So: **4K does not need a different panel layout.** Same box, sharper picture scaled in.  
It should **not** go dead or over-stretch just because resolution went up.

---

## Honest limits (not a reason to edit now)

- If a cam sends a **weird aspect** (not 16:9), the box may adjust when metadata arrives — still scale-to-fit, not freestyle empty gutters.  
- Extreme window resize still uses the same fit-five math.  
- **No change** unless you FAIL something new.

---

## One line

> **PASS locked — don’t touch. 720 / 1080 / 4K all scale into the same panel box with contain; picture should still fill nicely.**
