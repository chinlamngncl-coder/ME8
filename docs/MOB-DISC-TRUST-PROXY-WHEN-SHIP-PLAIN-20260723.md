# MOB DISC — When do we need the front door / C4? (plain)

**Date:** 2026-07-23  
**Status:** PAPER — packing / IT reality; no APPLY  

---

## Short answer

**No — shipping without C4 does not mean “their network cannot pass through.”**

C4 is only needed when **someone installs a reverse proxy (front door)** in front of Fleet and Fleet must trust that door’s headers.

If the customer runs like lab (browser → Fleet HTTPS directly), **C1–C3 are enough.** Traffic still works.

---

## Two ways a customer can run Ops

| Way | What they type | Need C4? |
|-----|----------------|----------|
| **A — Direct (like lab)** | `https://SERVER-IP:4438` or Fleet’s own HTTPS | **No** |
| **B — Front door** | `https://ops.company.com` (normal 443) → nginx/Caddy → Fleet | **Yes** (trust proxy + correct Host) |

Most small sites can start with **A**.  
Bigger IT shops often want **B** (one company URL, their cert, their firewall rules).

---

## Will customer IT “demand” it?

**Sometimes yes, sometimes no.**

- They may say: “We only allow 443, our cert, our hostname.” → that is **front door = B** → do C4 (and give them the IT write-up).  
- They may say: “Just give us the server IP and port.” → **A** is fine → C4 can wait.

You do **not** guess. Install / handover doc should list **both** options. IT picks.

---

## If we ship without C4, what breaks?

| Situation | What happens |
|-----------|----------------|
| Direct HTTPS (A) | Works (after C1–C3) |
| They add nginx later but leave trust proxy **off** | Page may load; login rate / “am I https?” / some links can be **wrong** (fake or internal host/IP) |
| They add nginx and turn trust proxy **on** with C4 done | Correct visitor IP, https flag, public hostname |

So: **not** “network blocked.” Risk is **wrong identity / wrong links behind a front door**, not “packets cannot pass.”

Cameras (SIP / PTT / WVP) are a **separate** firewall list — open those ports either way. That is not C4.

---

## What we put in the ship pack (when you pack)

1. **Default lab-like path:** HTTPS Ops direct (document the URL/port).  
2. **Optional IT path:** “If you put nginx/Caddy in front, apply trust-proxy settings (C4) + this short firewall/TLS sheet.”  
3. Do **C4 APPLY** when you are ready to lock that optional path — or when first customer IT says they need the front door.

---

## One line

**C4 is for company front-door HTTPS; without it direct access still works — IT only needs it if they put nginx/Caddy in front, not because the LAN is otherwise blocked.**
