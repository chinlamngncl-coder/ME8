# MOB DISC — TLS genre in plain English

**Date:** 2026-07-23  
**Status:** PAPER — memory only  

---

## What I meant (simple)

**Lab today still has HTTP on port 3988.**  
That is normal. We did **not** turn HTTP off.  

You can still open:
- `http://localhost:3988` (same as before)

**HTTPS is extra**, on port **4438**:
- `https://192.168.1.38:4438` (your Wi‑Fi IP)

So: **HTTP stays. HTTPS is added.** Not “HTTP is gone.”

---

## What is **not** part of TLS work

| Thing | Meaning | When |
|-------|---------|------|
| **AES** | Locking evidence zip with a password/crypto later (Tactical) | **Not now** — different job from HTTPS |
| **PTT visual alert** | Red pulse on the video tile when officer presses talk | **Not now** — we parked that; do after HTTPS sockets if you want |

TLS genre = make the **webpage** secure (https), then fix sockets/media.  
It does **not** mean build AES export or the PTT pulse.

---

## TLS steps (only these)

1. **C1** — HTTPS page (done in code; you still need to open it and say PASS/FAIL)  
2. **C2** — Fix talk/video sockets so they work under https  
3. **C3** — Video stream through same https host  
4. **C4** — Proxy headers if needed  

One step at a time when you say APPLY.

---

## One line

**HTTP :3988 still works; HTTPS :4438 is the new door. AES and PTT pulse are other jobs — not this TLS list.**
