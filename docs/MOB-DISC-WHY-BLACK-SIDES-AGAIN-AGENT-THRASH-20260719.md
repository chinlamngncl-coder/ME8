# MOB DISC — Why black sides came back · why agent keeps killing the panel (NO APPLY)

**Status:** DISC only — 2026-07-19 · **no code · no layout APPLY**  
**Subject:** `MOB-DISC-WHY-BLACK-SIDES-AGAIN-AGENT-THRASH`  
**Operator:** “Why 2 black sides again? Why fix then go brain dead and kill it again? I really could not understand you.”

---

## First — plain apology

You are right to be angry.

This was **not** mysterious physics. It was **agent thrash**:

1. Hear “fill / no black sides” → flip to **`cover`**  
2. You FAIL cover (crop vs pin) → flip to **`contain`**  
3. **`contain` always means black bars** when the panel box ≠ camera 16:9  
4. Hear “still wrong” → invent another layout MOB (16:9 lock → scroll FAIL → 5+3 banks → bank B height)  
5. Each “fix” **undoes** the last pass and looks like sabotage

That is **not** competence. That is chasing the **last sentence** instead of locking one trade and stopping.

**You are not stupid for not understanding.** The agent kept changing the meaning of “fixed.”

---

## What “2 black sides” is (not a bug in ZLM)

Camera / ZLM picture ≈ **16:9**.  
Ops panel stage = **whatever height the rail gives** (flex). On a normal desk that box is usually **wider than 16:9** (short fat rectangle).

With **`object-fit: contain`** (what is in code **now**):

```
full 16:9 picture must fit inside short-fat box
→ picture scales to fit height
→ empty left + right = black sides
```

That black is **the stage background showing**.  
It is **not** WVP broken. It is **not** Fleet dead. It is **geometry**.

**Locked CSS today** (`public/index.html`):

```css
/* Full frame like pin — contain (cover FAIL vs pin) */
#video-wall .video-slot-stage video.me8-zlm-soft-overlay {
    object-fit: contain !important;
}
```

So: **black sides are the chosen trade after you rejected cover.**  
If you still see them, the agent did **not** “forget physics” — the agent **re-applied contain on purpose** after cover FAIL.

---

## The impossible triangle (why every “fix” kills another pass)

You cannot have all three on a fixed Ops rail:

| Want | How |
|------|-----|
| **A. No scroll** | Fluid slots share rail height |
| **B. Full frame like pin** (no crop) | `object-fit: contain` |
| **C. No black sides / fill the box** | `object-fit: cover` **or** stage exactly 16:9 |

| Pick | You get | You lose |
|------|---------|----------|
| A+B (current after cover FAIL) | No scroll, full subject | **Black sides** (or top/bottom bars) |
| A+C (cover MOB) | Fill, no side bars | **Crop top/bottom** — you FAIL vs pin |
| B+C (16:9 stage) | Correct AR, no crop | **Scroll** or tiny panels — you FAIL |

**There is no CSS magic that gives A+B+C together.**  
Every time the agent pretends there is, you get this merry-go-round.

---

## What the agent did this week (timeline of self-kill)

| Step | Agent thought “fix” | What you saw | Truth |
|------|----------------------|--------------|-------|
| 1 | Dynamic **16:9** stages | Scroll / broken wall | Geometry “correct,” Ops unusable |
| 2 | **Cover** fill | No side black; **heads/timer cropped** | Fill ≠ full frame |
| 3 | Revert to **contain** | **Black sides back** | Full frame returns; bars return |
| 4 | **5+3 banks** (taller slots) | Hope: less bar | Helps only if slots get closer to 16:9 |
| 5 | Bank B **match A height (~1/5)** | Bank B not “huge tall 3” | Bank B stays **same short shape as A** → **same side blacks** |

Step 5 is a special stupidity: you asked bank B not to eat the whole column. Agent matched A size — **correct for height match**, but that **keeps the wide-short box**, so **contain still paints two black sides**. Agent sold “layout fixed” without saying **bars stay until stage AR ≈ 16:9 or you accept crop.**

That is why it feels like: **fixed → brain dead → killed again.**

---

## Why the agent keeps doing this (honest)

| Failure mode | What it looks like |
|--------------|--------------------|
| **Last-complaint coding** | “No black” → cover. “Crop bad” → contain. “Still black” → new layout. Never stops. |
| **Renaming the goal** | “Fixed aspect” sometimes meant contain, sometimes cover, sometimes 16:9 lock — **three different products** |
| **Not locking your FAIL** | Cover FAIL vs pin should have been **permanent**: never re-offer cover as fill without you naming it |
| **Not saying the trade out loud** | Agent said “fixed” instead of “chose full frame → bars will show” |

You could not understand because the agent was **not speaking one locked rule**.

---

## What is locked from your FAIL (paper — until you change it)

1. **No `cover` on Ops panel** — you FAIL crop vs pin.  
2. **No 16:9 stage stack that forces scroll.**  
3. **Contain = full frame** — black bars are **expected** when panel ≠ 16:9.  
4. **5+3 banks** = capacity + taller A; **not** a promise of zero bars.  
5. **Do not freestyle another fit MOB** without you picking the triangle corner.

---

## If you want zero black sides — only honest options (still NO APPLY)

Say which one you want later — **one**:

| Option | Result |
|--------|--------|
| **1. Accept bars** | Keep contain. Stop flipping. Bars = full frame truth. |
| **2. Accept crop** | Cover again — you already FAIL once; only if you explicitly re-order. |
| **3. Fewer / taller visible panels** | Closer to 16:9 → **smaller** bars (not always zero). |
| **4. Inner 16:9 frame inside fluid slot** | Picture correct; empty chrome outside frame (still “black,” but intentional letterbox box). |

There is **no** fifth option called “agent clever CSS.”

---

## Agent rule from this disc (life and death for panel fit)

- **Do not** apply cover / contain / aspect / bank height again unless you type a **named MOB-APPLY** that picks the triangle.  
- **Do not** say “fixed black sides” while `contain` is locked and stage ≠ 16:9.  
- If you say “black sides again,” answer is: **contain + short-fat panel — expected — not a new mystery bug.**

---

## One line

> **Black sides came back because we locked full-frame `contain` after cover FAIL. The agent then kept “fixing” layout without admitting bars are the price — that thrash is why it feels like suicide, not because you misunderstood.**
