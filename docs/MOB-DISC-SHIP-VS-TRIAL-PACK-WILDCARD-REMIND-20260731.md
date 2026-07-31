# MOB DISC — Ship vs trial pack: wildcard rule + remind every pack ask

**Date:** 2026-07-31  
**Status:** LOCKED — replaces blunt “never wildcard” with a **two-lane** rule  
**Operator:** *If I say ship — no wildcard inside. If I say I want a trial one pack — then put it in. Reminder every time I ask to pack is safer. Got it?*  
**Supersedes tone of:** `MOB-DISC-FINAL-SHIP-NEVER-TRIAL-WILDCARD-20260731.md` (that disc’s **commercial** hard stop stays; this disc adds the **trial pack lane** + **every-pack reminder**)

---

## Got it (two lanes)

| Operator says | What goes in the zip | Wildcard? |
|---------------|----------------------|-----------|
| **Ship** / customer ship / commercial / send to client / final pack / paid delivery | Host-locked `license.lic` for **that machine HWID** | **NO. Hard stop if present.** |
| **Trial pack** / trial one pack / partner trial zip / “trial for partner with no HWID yet” | May include signed **`trial_wildcard`** (expiry + caps still required) | **YES — only because you named trial** |

**Do not guess.** If unclear → ask once: *Ship (host-locked) or Trial pack (wildcard OK)?*  
Then remind the rule for that lane.

---

## Safer behaviour: remind **every time** you ask to pack

Whenever operator says any of: **ship / pack / customer pack / trial pack / CREATE ship / packing checklist / send to client / delivery zip**

AI **must print** this short block (no daily nag outside pack talk):

```text
PACK LICENSE LANE
- You said: SHIP or TRIAL PACK? (if unclear, ask)
- SHIP → license MUST be host-locked HWID. trial_wildcard = STOP, do not zip.
- TRIAL PACK → trial_wildcard allowed; still need expiry + caps; say so on the README.
- Never put license-private.pem in any zip.
```

That reminder every pack ask is **more safe** than relying on memory. Operator ordered it — **lock**.

---

## Simple English

- **Ship** = real product for a real machine → license glued to **their** PC.  
- **Trial pack** = temporary tryout when you **explicitly** want wildcard.  
- AI reminds you **at pack time** which lane you are on.

---

## Lock

1. Ship ≠ trial pack.  
2. Wildcard only when operator **names trial pack**.  
3. Reminder block **every** pack/ship ask.  
4. No code in this disc.
