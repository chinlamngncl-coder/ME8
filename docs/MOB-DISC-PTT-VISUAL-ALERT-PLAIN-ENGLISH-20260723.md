# MOB DISC — PTT visual alert (plain English)

**Date:** 2026-07-23  
**Name:** `PTT-VISUAL-ALERT-FULLSTACK-V1`  
**Status:** APPLIED + operator **PASS** — see `MOB-APPLIED-PTT-VISUAL-ALERT-FULLSTACK-V1-20260723.md`  
**Lock disc:** `MOB-DISC-PTT-VISUAL-ALERT-GOOGLE-ASK-LOCKED-PASS-20260723.md`  
**Also:** `MOB-DISC-NEXT-AFTER-SETTINGS-SKIP-PTT-VISUAL-ALERT-20260723.md`

---

## What is it? (one sentence)

When an officer presses the **talk button** on the bodycam, the matching video tile on the HQ screen **lights up / pulses**, so the dispatcher can see who is talking even if the video is muted.

---

## Why you need it

Today:

- Dispatcher often watches live video with **sound off** (many cameras).
- Officer presses **PTT** (push-to-talk) on the device.
- HQ **hears** nothing until someone unmutes — and may not know **which** camera is talking.

With this MOB:

- That officer’s tile **flashes** (border / glow / small mic cue).
- Dispatcher looks at the right tile and can unmute.
- When they stop pressing talk, the flash **goes away** in about a second.

---

## How the device signals “talking”

The bodycam does **not** send a clean “button pressed” message over SIP for this.

It just starts sending **PTT audio packets** over UDP. Those packets have a type code: **`dwCMD = 130`**.

So the server already receiving PTT audio can say:

- “I just got a 130 from device X” → **that** tile is talking → pulse ON  
- “No 130s from X for ~0.8 seconds” → pulse OFF  

**Audio path stays the same.** We only add a **visible cue**.

---

## What “FULLSTACK” means (not scary)

| Part | Simple job |
|------|------------|
| **Back** | Notice `130` packets → tell the browser “device X is talking / stopped” |
| **Front** | Put a CSS class on that camera’s tile |
| **Look** | Pulse / highlight that tile |

One product feature across server + dashboard — not a new app.

---

## What it will NOT do

- Will **not** change how PTT sound is routed or recorded  
- Will **not** change SIP call / invite logic  
- Will **not** touch Settings UI  
- Will **not** auto-unmute (dispatcher still chooses unmute)  

---

## When to build

Only after you say:

```text
MOB-APPLY PTT-VISUAL-ALERT-FULLSTACK-V1
```

Until then: **paper only** — remember the idea; no code.

---

## How you will test (after APPLY)

1. Open Ops wall (video tiles). Keep tile muted.  
2. Press PTT on one live BWC → **that** tile pulses.  
3. Release PTT → pulse clears in ~1 second.  
4. Other tiles stay quiet. Talk audio still works as before.

---

## One line

**PTT visual alert = “who is pressing talk?” light on the video tile — so HQ can see talkers while muted; build only when you APPLY the name above.**
