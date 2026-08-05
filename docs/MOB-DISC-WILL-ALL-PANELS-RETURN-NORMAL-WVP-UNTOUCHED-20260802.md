# MOB DISC — Will everything go back to normal? Did we touch the PASS WVP/ZLM path?

**Date:** 2026-08-02  
**Status:** DISCUSSION ONLY — no code until you say MOB-APPLY  
**Tone:** Straight answers. No shortcuts. No joking.

---

## Your questions

1. If we fix this, do **Tactical, Command Wall, panels, pin mirror, Face Recognition, and ANPR** all go back to normal?  
2. Are you sure we did **not** change the PASS WVP/ZLM method?  
3. Write it down so we can check.

---

## Straight answer

### Did we change the PASS WVP / ZLM **server** path?

**No — not the handoff itself.**

We did **not** change:

- Turning handoff on/off (`FM_WVP_VIDEO_HANDOFF`)
- WVP `startPlay` / stop play on the server
- How the dashboard gets the FLV link (`flvUrl`)
- ZLM docker / ports as the video base
- Firmware Gold pin rule in `video-wall.js` (pin still **mirrors** the wall; we did not rebuild a second pin player)

So the **July 20 handoff idea** is still:  
camera → WVP → ZLM FLV link → browser plays it → pin copies the wall.

That backend / handoff contract was **not** rewritten in the Axiom night.

---

### Did we change something on the path you use every day?

**Yes — the browser player that sits on top of that FLV link.**

Be honest: the PASS stack was “handoff gives FLV → **plain** `attachFlvPrimary` plays it.”

Tonight we made **every** panel that calls `attachFlvPrimary` go through **`AxiomFlvManager`** instead of the old plain mpegts attach. That is still the same FLV link from WVP/ZLM — but the **way the browser plays it** changed.

So:

| Layer | Changed tonight? |
|-------|------------------|
| WVP / ZLM handoff (server gets `flvUrl`) | **No** |
| Firmware Gold pin = mirror wall (no second stream) | **Code not rewritten**; pin still mirrors |
| Browser FLV player used by Ops / Command Wall / FR / ANPR / Tactical | **Yes** |

If someone says “we did not change WVP/ZLM at all,” that is only half true: we did not change the **server handoff**, we **did** change the **player** every panel uses for that handoff FLV.

---

## What exactly the new player does (why it is not “PASS normal”)

All of these run for panels that use `Me8LivePlayerFactory.attachFlvPrimary`:

1. **Aggressive soft-chase** — every 1 second: speed up at 0.5 s lag, jump at 2 s → **jerking** (main complaint).  
2. **Stash buffer off** — different buffering than the old attach.  
3. **Pause when tile hidden / tab in background** — can feel like stop-start when you switch panels.  
4. **Sub-stream URL rewrite when grid looks big** — Command Wall can ask for a `*_sub` FLV URL. If that sub-stream is missing or different, picture quality / attach can change. **That is a real change on top of PASS**, not just chase.  
5. **LIVE text overlays hidden** — look only; not the jerk cause.  

Pin mirror: we did not rewrite Gold pin code, but pin **copies whatever the wall video is doing**. If the wall player jerks, the pin looks jerky too.

---

## If we turn soft-chase off — do ALL panels go back to normal?

**Mostly the jerk should stop on every panel that uses that shared attach** — including:

- Operations wall  
- Command Wall  
- Face Recognition live tiles  
- ANPR live tiles  
- Tactical live attach (same factory)  
- Pin mirror (follows wall once wall is smooth again)

**But “100% same as July PASS” is only true if we also undo the other player changes**, not chase alone:

| Fix | Needed for “like PASS again”? |
|-----|-------------------------------|
| Soft-chase **off** | **Yes** — required for smooth |
| Stop forcing sub-stream URLs on big grids | **Yes** — otherwise Command Wall may still not match PASS main stream |
| Stop pausing decode when tab/tile hidden (or match old behavior) | **Recommended** — avoid odd pause when switching panels |
| Keep WVP handoff / `flvUrl` as today | **Yes** — do not turn handoff off |
| Leave pin mirror code alone | **Yes** |

So: **chase-off alone ≈ smooth again for most panels**, but a full “back to PASS player” means chase off **and** no surprise sub-stream / pause behavior.

---

## What we did NOT break (so we do not “restore Gold” for this)

- We are **not** saying the cure is `RUN RESTORE-ME8-FIRMWARE-GOLD` for this jerk. That restores a whole old tree.  
- We are **not** saying turn off `FM_WVP_VIDEO_HANDOFF`.  
- ANPR crop / OCR enhance is a **different** story — not the live video smoothness story.

---

## Recommended APPLY (when you say so)

### `RESTORE-WVP-FLV-ATTACH-SMOOTH-V1`

Plain meaning:

1. Keep WVP/ZLM handoff and FLV links exactly as the PASS path.  
2. Make the shared browser attach play like July 20 again: **no aggressive chase**, hard mpegts chase still **off**.  
3. Do **not** rewrite FLV URLs to sub-stream unless you later ask for that.  
4. Do not rewrite pin Gold / wall attach call sites — only the shared player behavior.  
5. After that: Ops, Command Wall, FR, ANPR, Tactical, and pin mirror should feel normal again because they all share that attach.

---

## One clear sentence

**WVP/ZLM handoff (how we get the FLV) was not rewritten. The browser player on that FLV was. That player feeds Ops, Command Wall, FR, ANPR, Tactical; pin mirrors Ops. Fix the shared player (chase off + no sub-stream surprise) and those surfaces should return to the smooth PASS feel — without turning handoff off.**
