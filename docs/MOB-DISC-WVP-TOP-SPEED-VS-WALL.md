# MOB DISC — Make our live video as fast as WVP

**Status:** talk only — **no code**  
**Date:** 2026-07-14  
**Search:** `WVP top speed`, `wall fast like WVP`, `why wall slower`

---

## What you saw (plain)

In **WVP** you clicked Play → picture was **fast** (felt live).

On **our command wall** (and our earlier ZLM lab page) it often feels **slower**.

You want: **that same fast feel** on our wall / our players — not only inside WVP.

---

## Why WVP was fast (no tech lecture)

WVP does almost one job:

**camera sends video → media box shows it in the browser**

Our wall today does more steps:

**camera → our server → convert format → wall player**

Extra steps = more delay. That is the whole story.

(Our earlier “put ZLM on the side” lab often **converted twice** — that made it **worse**, not better.)

---

## What this MOB family is *for* (one sentence)

**Make our live picture path as short as WVP’s**, so the wall feels as fast — without breaking Open All / pins.

Not: “rename a lab.”  
Not: “change a port forever.”  
Not: “force everyone to use WVP UI.”

---

## Locked direction (DISC)

**Go Choice 1 — fix our own live path.**

Cameras stay on Fleet (**5060**). Cut the slow convert. Fast picture on **our** wall.

WVP stays a **separate** GB/tender lab — do **not** make the wall depend on WVP for day-to-day 8-cam ops.

Order: measure → one cam fast on our test page → then one wall tile. Not Open All first.

**2026-07-14:** `mob-one-cam-fast-on-our-page` **REVERTED** — pool tee broke wall play (CHECKPOINT FAIL). Do not put ZLM push inside pool FFmpeg again.

---

## What we will **not** do from this DISC

- No secret wall code edits tonight  
- No “Open All all on new engine” until **one camera** is proven fast on **our** player  
- No shipping lab port **80** into the next BWC pack  
- No more player “buffer tricks” that already caused minutes of lag

---

## Bad names — translated

| Old jargon | Means in English |
|------------|------------------|
| “H.264 passthrough lab” | **Lab: don’t re-convert the camera video — show it as-is** |
| “ZLM” | The **media box** that turns camera RTP into a browser playable stream |
| “JSMpeg / MPEG1” | Our **current** wall player path (works, but extra convert) |
| “Gate D” | “Put new player on the **wall**” (dangerous; go slow) |

If a MOB name sounds like nonsense, demand the **one-sentence job** first.

---

## Suggested next MOB names (plain jobs)

| Say this | Job in English |
|----------|----------------|
| `mob-measure-wvp-vs-wall-speed` | Time both with a phone clock — how many seconds behind real life |
| `mob-one-cam-fast-on-our-page` | One camera, fast like WVP, on **our** test page (not wall yet) |
| `mob-wall-one-cam-fast` | Same, one tile on the wall — only after test page PASS |
| `mob-wvp-embed-one-panel` | Show WVP’s fast picture inside one Fleet panel (Choice 2) |

---

## Related

- WVP lab up: `docs/MOB-DISC-ZLM-GB28181-WVP.md`  
- Don’t chase buffer knobs: `docs/MOB-DISC-ZLM-OPTION-B-PROXY-DESIGN.md` (PARKED)
