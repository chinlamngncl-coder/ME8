# MOB DISC — Industry fix for server lost↔OK (one path, no “pick A/B”)

**Date:** 2026-08-12  
**Status:** DISC only — no code  
**Operator:** Stop asking me to choose / give up. Find how real IT / VMS / BWC platforms solve this. Speak human.

---

## Plain English

Your pain: **the software server** goes lost → OK → lost. Not cameras.

I kept handing you “turn it off or harden?” That feels like **giving up**. Wrong.  
Here is **one** industry way. That is the plan. Not a menu.

---

## How the industry actually does this

Serious VMS / BWC / C2 stacks split jobs:

| Plane | Job | Must stay up |
|-------|-----|----------------|
| **Control** | Login, SIP, Online, map, commands, VC signaling | **Always** — this is “the server” you feel |
| **Media** | Live video (WVP / ZLM) | Separate media engine |
| **Analytics** | Face / plate / weapon watching streams | **Separate AI workers** — pull stream **by URL**, push hits back |

They do **not** hang heavy grab/OCR off a **fork inside** the control process and hope.  
If AI crashes, **control stays**. If AI is busy, **control stays**.

We already did half of that: **Python sidecars** for ANPR/FR/Weapon brains.  
We then did the **wrong** half: forked an ANPR grab loop **from inside Fleet Node**. That can make the **whole software** feel lost↔OK. That was the hammer-to-own-head design.

---

## One locked solution (not options)

**Treat ANPR live watching like the sidecar: its own supervised process.**

1. Fleet main = control only (SIP, presence, sockets, WVP start/stop, APIs).  
2. **ANPR ingest service** = separate Node (or later same box, Start bat / Windows service) that:
   - Gets “which cams to watch” from Fleet  
   - Gets **live stream URLs from Fleet** (never guesses WVP memory in another process)  
   - Grabs → sidecar OCR → posts hits to Fleet  
3. If ANPR service dies → plates stop; **server stays OK**.  
4. Same blueprint later for FR and Weapon.  
5. 1-click pack: Start bat starts Fleet + sidecars + **anpr-ingest** (same idea as START-ANPR.bat).

That is the sellable concurrency method. Not “slow ANPR.” Not “you pick hatch or die.”

---

## What about the broken fork we already shipped in lab?

It was a **wrong pattern**. Next APPLY **replaces** it with the external service pattern above — including killing the in-process fork default so the control server stops taking the hit.

**One APPLY name (when you say apply):**  
`MOB-APPLY ANPR-INGEST-EXTERNAL-SERVICE-V1`

**Does (when applied):**

- Stop relying on `fork()` from inside Fleet as the product design  
- Run ANPR ingest as separate entry (pack sibling / Start bat)  
- Fleet pushes watch list + **stream URLs**; ingest posts ticks back  
- FR/Weapon follow **same** blueprint in later APPLYs (not this one)

No A/B. No “give up and only hatch.” Hatch can be a **temporary line inside that APPLY** only to keep lab alive while the service boots — not a question for you.

---

## Rules

- No code until you type apply for that name (or clear go-ahead for it).  
- I will not ask you to pick between quitting and fixing.

---

## Bottom line

**Industry:** control server ≠ AI grab loop.  
**Our mistake:** AI grab forked inside control.  
**Fix:** ANPR ingest as its own service, URLs from Fleet, same idea as sidecars — then FR/Weapon the same.  
**You say when:** `MOB-APPLY ANPR-INGEST-EXTERNAL-SERVICE-V1`
