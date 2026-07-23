# MOB DISC — Flexible res (720 / 1080 / 4K) · not fixed pixels · got it

**No code. Confirm only.**

---

## Got it?

**Yes.**

| You said | Locked reading |
|----------|----------------|
| Not only 720p | Also **1080p**, **4K**, whatever the cam sends |
| Must be **flexible** | Layout follows **shape (aspect)**, not a frozen pixel size |
| Don’t “fix” for one res | Then high res → panels **dead**, **over-stretch**, or broken |
| Google already taught this | Agent must **keep** that lesson — not invent 300×136 / 242×136 forever |

---

## What “flexible” means here (plain)

1. **Aspect ratio** (usually 16:9) = the rule for the **box shape**.  
2. **Pixel count** (720 / 1080 / 4K) = how sharp the stream is — **browser scales** into the box.  
3. Panel layout sizes the **box in CSS / % / fit-to-rail** — **not** “always 136px tall” as a product truth for every monitor and every stream.  
4. `object-fit: contain` (or the locked fit) scales **any** res into that box without assuming 1280×720 only.  
5. Never bake “works on lab 720 only” into wall geometry.

---

## What agents must stop doing

- Hardcoding **one** pixel size as if all BWCs are 720p forever  
- Stretching video to force fill when res/AR changes (over-stretch / ugly)  
- Layout that only “passes” on one lab stream, then dies on 1080/4K  
- Ignoring Google’s flexible-res teaching after the next APPLY

---

## What next APPLY must respect (when you name it)

Whatever we do for “no black sides / fit five / full width 16:9”:

- Box = **flexible 16:9 (or stream AR)** in the rail  
- Stream pixels = **scaled into the box** (720 or 4K same path)  
- No pin compact logic  
- No “lab 720 only” constants as the product

---

## One line

> **Got it. Shape flexible for 720/1080/4K — scale into the box. Never lock one pixel size that dies or stretches when high res comes in. Google already taught that.**
