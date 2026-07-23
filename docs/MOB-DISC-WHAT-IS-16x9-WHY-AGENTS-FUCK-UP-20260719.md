# MOB DISC — What is 16:9? Why agents keep fucking it up

**No code. Plain talk.**

---

## What is 16:9?

**16:9** = the normal shape of your camera / ZLM picture.

- Width : height = **16 to 9**  
- Example: **1280×720**, **1920×1080**  
- Math: width ÷ height ≈ **1.78** (almost 1.8)

So if height is **136px**, a true 16:9 box needs width ≈ **136 × 16 ÷ 9 ≈ 242px** — **not 300**.

If the box is **300×136**, width÷height ≈ **2.21** — that is **wider than 16:9**.  
Put a 16:9 video in that box with “show whole picture” (`contain`) → **black left and right**. Every time. Not a mystery.

---

## What Google (and the discs) already taught

Same lesson, over and over:

1. Camera picture is **16:9**.  
2. Ops panel box is often a **different** shape (too wide / too short).  
3. Then you only get three choices:  
   - **Full picture** → black bars where the box doesn’t match  
   - **Fill the box** → no bars, but **crop** top/bottom  
   - **Change the box** to real **16:9** (or close) → full picture **and** no bars  

Agents keep “fixing” fit (`cover` / `contain`) **without** fixing the box shape — or pick a box (**300×136**) that is **not** 16:9 and pretend it is “like pin so sides go away.” That is the fuck-up.

---

## Why Cursor agents keep fucking it up

| Failure | Plain |
|---------|--------|
| Chase last complaint | “No sides” → cover. “Crop bad” → contain. “Match pin size” → 300×136. Never lock **one** triangle. |
| Copy pin **number** not pin **shape math** | Pin height 136 with width ~300 is also wider than 16:9; pin *look* is not “300×136 magic kills sides.” |
| Don’t check the screen | Ship APPLY, you send pic of cut-off UI + black sides. |
| Ignore Google / own discs | Aspect notes already said: stage ≠ 16:9 ⇒ contain = sides. |

Not because 16:9 is hard. Because agents don’t **hold** the rule after the next APPLY.

---

## One picture in your head

```
Camera (16:9):     [====VIDEO====]

Box too wide:      [##][====VIDEO====][##]   ← black sides (contain)
Box filled:        [====CROPPED====]         ← no sides, lose top/bottom (cover)
Box true 16:9:     [====VIDEO====]           ← same picture, no sides
```

---

## What “do it right” means next time (still no APPLY)

When you APPLY again, the agent must say **which** of the three is locked — and if full picture + no sides, the **video box must be 16:9** (e.g. width 300 → height ≈ **169**, or height 136 → width ≈ **242**), **and** the head buttons must fully fit (no cut-off panel 5).

---

## One line

> **16:9 = camera shape (~1.78 wide). 300×136 is not 16:9, so contain = black sides. Agents keep flipping cover/contain instead of fixing the box. That’s why Cursor keeps fucking it up.**
