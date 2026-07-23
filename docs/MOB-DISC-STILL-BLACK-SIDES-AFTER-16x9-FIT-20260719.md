# MOB DISC — Still 2 black sides after 16:9 fit? (your pic)

**No code. Your screenshot is enough.**

---

## So? Do we still have to have black sides?

**No — not forever.**  
But **yes on screen right now** — and your anger is fair. The last APPLY did **not** clear what you mean by “2 side black.”

---

## What your pic shows

Live panel: picture in the middle, **thick black left and right**.  
Head buttons look OK (wider wall helped).  
**Picture / sides = still FAIL.**

---

## Why (plain — this is the real bug)

We did two different things and mixed them up:

| What we did | What you see |
|-------------|----------------|
| Made a **16:9 video island** in the middle | Correct shape for the camera |
| Left the **panel box full rail width** (wide) | Empty space beside the island |
| That empty space is **black** | Looks exactly like **“2 side black”** |

So the sides are often **not** “contain failing inside 16:9.”  
They are **black gaps beside a smaller 16:9 box** sitting in a **wider** panel.

From your eye: still fucked. From the agent: “16:9 is correct” while the panel still shows bars. **Useless to you.**

Also possible: stream not exactly 16:9 → small bars *inside* the island. Your pic looks more like **wide gaps** = island-in-wide-box.

---

## Honest answer to “still got to have 2 side black?”

| Goal | Forced? |
|------|---------|
| Full picture + no black in the **panel** | **No** — doable if the **video area fills the panel width** (or the panel is only as wide as the video) |
| Full picture + five panels fit + fat button row | **Tight** — need one clear layout, not a floating island |
| Same as pin + no sides + no crop | Only if panel video area shape matches the stream |

---

## What to do next (suggest — you APPLY)

**One idea that matches what you wanted:**

1. Video stage **width = full panel content width** (no island).  
2. Height = width × 9/16 (**16:9**).  
3. If five don’t fit → **shrink that whole 16:9** (both W and H) until five fit — still 16:9, still full width of a **slightly narrower** wall if needed.  
4. **contain** inside — no side gaps in the panel.  
5. Head stays full width above.

Suggested name when you want code:  
`MOB-APPLY-PANEL-16x9-FULL-WIDTH-FIT-FIVE`

---

## One line

> **You shouldn’t have to live with black sides. Right now the 16:9 box is a small island in a wide black panel — that’s why sides remain. Next APPLY must fill width (or shrink the whole panel to the video), not float a centered strip.**
