# MOB DISC — Sidecar port 10048 (ANPR 8768 / Weapon 8769) — 2026-08-11

**Status:** Diagnosed. **No code this turn** (not a product bug to “fix with APPLY” unless start scripts are wrong).  
**Read:** `.cursorrules`

---

## What your screenshot means

`Errno 10048` on `127.0.0.1:8768` = **another process already owns that port**.  
The bat told you correctly: *Close any other ANPR window and try again.*

This is **not** “Windows randomly blocking our product so nobody will buy.” It is **two ANPR sidecars** fighting for the **same** local port.

---

## Lab check (now)

| Port | Role | State (this morning) |
|------|------|----------------------|
| **8768** | ANPR sidecar | **LISTEN** — python uvicorn `app:app` PID **37668** |
| **8769** | Weapon sidecar | **LISTEN** — python uvicorn `app:app` PID **56836** |
| **8767** | (other python) | LISTEN PID **13196** |

So:

- **ANPR is already running.** Starting a second ANPR window → 10048 (your screenshot).  
- **Weapon port is already bound too.** A second Weapon start would fail the same way. If Weapon “can’t test,” it is often (a) double-start, or (b) sidecar up but UI/weights/Fleet not talking — **not** “8769 free and blocked by mystery.”

---

## What you do (operator)

### A — Want to use Analytics now (usual)

1. **Do not** open another ANPR/Weapon start bat.  
2. Leave the **already running** sidecar window open.  
3. Hard refresh Ops → Analytics → ANPR / Weapon.  
4. If UI says down: in browser open `http://127.0.0.1:8768/docs` (ANPR) and `http://127.0.0.1:8769/docs` (Weapon) — if docs load, sidecar is up.

### B — Sidecar zombie (window closed but port stuck)

PowerShell (Admin if needed):

```powershell
# See who owns the port
netstat -ano | findstr "8768 8769"

# Stop ONLY that PID (example — use the PID from netstat)
taskkill /PID 37668 /F
```

Then start **one** ANPR bat again. Same for 8769 / Weapon.

### C — Never do

- Start ANPR bat twice  
- Start Weapon bat twice  
- Change product to random new ports without a named MOB (breaks Fleet config)

---

## Why this feels “always ports”

Lab pattern: Fleet + ANPR + Weapon + FR + ZLM each need a port. **One process per port.** Orphaned python after crash/close-window keeps the bind → next Start looks like “network blocked.”

Industry: same as any local microservice (Docker, Redis, etc.) — not unique to Axiom.

---

## Weapon “can’t test at all”

1. Confirm `http://127.0.0.1:8769/docs` loads.  
2. If 10048 on Weapon start → close duplicate / kill PID on 8769, start **once**.  
3. If docs OK but no detections → different issue (weights / camera / UI) — say so after A/B; **not** port APPLY.

---

## Code later? (only if you APPLY)

Optional harden: start bat checks port-in-use → message “already running PID …” and exit 0 instead of crash. Needs named APPLY e.g. `SIDECAR-START-PORT-BUSY-FRIENDLY-V1`. Not required for buy — ops hygiene.

No APPLY this turn. Close the extra ANPR window (or kill 37668 if zombie) and use the one listener.
