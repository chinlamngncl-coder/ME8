# MOB DISC — What was SEC-NONSIP-ID-CRYPTO-RANDOM? (plain English)

**Date:** 2026-07-23  
**Status:** APPLIED already — this disc is **explain only** (why it existed; what you do)  
**Phrase that already ran:** `MOB-APPLY SEC-NONSIP-ID-CRYPTO-RANDOM-V1`  
**Audience:** Operator (not IT jargon)

---

## One sentence

This was a **behind-the-scenes security tidy** so the server does not invent file/camera IDs with a weak random. **It does not change what you see on the desk** (no new button, no new password, no new video path).

---

## What it is for

When Fleet creates things like:

- a **fixed camera** id on the map  
- a **temporary upload name** for FR face check  
- a **shared image** name in video conference  
- a **Command Wall** internal “who owns this fixed cam” token  

…it used to use a weak computer random (`Math.random`). Reviewers flag that as sloppy for a product that ships.

We switched those to a **stronger random**. Same product. Safer ID minting.

**It is not:**

- a new feature to test on the wall  
- WVP / live video / PTT / SOS  
- a login or password change  
- something that fixes a picture you were chasing  

---

## What you need to do (honest)

| If… | Do this |
|-----|---------|
| You are **not** packing a customer zip today | **Nothing.** Say **PASS** on this MOB and move on. |
| Fleet was already running when we applied | **Restart Fleet once** (same as any server MOB) so the new code is loaded. That is the only real step. |
| You use Command Wall after restart | One **Ctrl+F5** is enough so the browser loads the new Command Wall script. |
| You want to “prove” it | Optional smoke only — **not required**: open Command Wall, or add/edit a fixed cam, or do a normal FR verify upload. If it works like yesterday → PASS. |

**You do not need to** invent a special test, open FR share, or learn crypto.

---

## PASS / FAIL (operator eyes)

| Result | Meaning |
|--------|---------|
| **PASS** | After restart (and Ctrl+F5 if you open Command Wall), desk works like before — live, map, FR, conference as you normally use them. |
| **FAIL** | Something that worked before restart is broken (e.g. Command Wall won’t open, fixed cam save fails). Tell me what you clicked and what you saw. |

There is **no** new green light or toast that means “crypto IDs work.” Absence of breakage = PASS.

---

## Why the last message felt like noise

Agent said “smoke fixed-cam / FR upload / share” as optional proof. That sounded like a homework list.  
**Correct operator job for this MOB:** restart once → if desk is normal → **PASS**. Stop.

---

## Related (already done this morning — also mostly invisible)

| MOB | Plain meaning | Your job then |
|-----|---------------|---------------|
| S0 upload safe-name | Evil upload filenames can’t escape the evidence folder | Optional evil-name test; or trust verify |
| Lab creds + ingress pin | Docker lab secrets from `.env`; pin LiveKit ingress version | Only matters before **customer** expose; lab keeps old defaults |
| This nonsip ID MOB | Stronger IDs for non-SIP names | Restart → PASS |

---

## One line

**Security housework for ship review — not a live-video MOB. Restart Fleet once; if everything still works, say PASS and we pick the next real product MOB.**
