# MOB DISC — Software / server lost → OK → lost (not cameras)

**Date:** 2026-08-12  
**Status:** DISC only — no code  
**Operator correction:** It is **not** the BWC cameras blinking. It is the **software / server** — lost, then OK, then lost, then OK.

---

## Plain English

What you see:

- Dashboard / Fleet **connection dies**  
- Then it comes back  
- Then dies again  

That means the **Mobility Axiom server process** (or the link to it) is unstable — restarting, freezing, or dropping the socket — **not** “camera went offline.”

I kept talking about camera Online/Offline. That was the wrong picture. Sorry.

---

## What can make the server do that (honest list)

After our ANPR “side process” work, likely causes to check when you APPLY a fix:

1. **Fleet Node overloaded or stuck** — then looks dead, then recovers.  
2. **ANPR child crash / respawn storm** — main process stressed; UI says lost/OK.  
3. **Whole Fleet process restarting** (crash, out-of-memory, bat restart).  
4. **Browser socket drop** while Node is still up (less common if you mean whole server).

Isolate was sold as “keep server calm.” If the **server itself** is lost/OK looping, that promise **failed**. Do not pretend otherwise.

---

## Rules

- No code until you say apply for one exact fix.  
- Next disc/fix must aim at **server stay-up**, not camera roster.

---

## Recommended next APPLY (only when you type it)

**Human ask:** “turn ANPR side process off so the server stops dying.”  

**APPLY name:** `MOB-APPLY ANPR-POLLER-ISOLATE-HATCH-OFF-V1`  

What it does when you apply: default the side process **off**, ANPR back inside the old path that at least ran, stop the child fork experiment until we redesign it properly (with stream URLs) without killing the server.

Or if you want harden not hatch — you say so in normal words after.

---

## Bottom line

**Problem = software/server lost↔OK.**  
**Not = cameras.**  
**No code this turn.**
