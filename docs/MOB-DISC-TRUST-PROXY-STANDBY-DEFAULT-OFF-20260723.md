# MOB DISC — C4 standby: ready if they want a front door (plain)

**Date:** 2026-07-23  
**Status:** PAPER — planning; APPLY later when you name it  
**Name:** `TRUST-PROXY-AND-HOST-V1`

---

## Your idea

> Put C4 in so we are ready. If they don’t use a front door, don’t block them. If they do, we already support it.

**Yes — that is the better standby plan.** With one rule:

| Setting | Who | Effect |
|---------|-----|--------|
| **Trust proxy OFF (default)** | Direct install (most labs / many customers) | Normal. **Does not block** anyone. |
| **Trust proxy ON** | Only when nginx/Caddy (or similar) is in front | Front-door ready; correct IP / https / hostname |

So: **ship the capability, default safe off.** Not “force ON for everyone.”

---

## Why not leave trust proxy ON always?

If ON with **no** front door, a clever client can fake **X-Forwarded-For** (fake visitor IP). That hurts login limits / audit.  

So standby = **code + docs + switch ready**, default **OFF**. Customer IT turns ON when they add the front door.

---

## Does C4 block people who don’t want a front door?

**No** — if default stays OFF and direct HTTPS (C1–C3) still works.

---

## What “standby” means when we APPLY C4 later

1. Clear **Production / lab-security** switch: Trust proxy on/off (already exists in spirit — C4 locks ship behavior + Host notes).  
2. Short IT blurb: “Direct URL” vs “Behind nginx — turn Trust proxy ON.”  
3. HOST / stream host stay real LAN (never 172.x).  
4. Default remains **OFF** so nobody is forced into front-door mode.

---

## Recommendation

**Yes — do C4 as standby when you are ready** (after current lab work / before or at pack).  
**Do not** turn it on by default for all customers.

When you want the work:

```text
MOB-APPLY TRUST-PROXY-AND-HOST-V1
```

---

## One line

**Standby C4 = ready for front door, default OFF so direct customers are fine; ON only when IT puts nginx/Caddy in front.**
