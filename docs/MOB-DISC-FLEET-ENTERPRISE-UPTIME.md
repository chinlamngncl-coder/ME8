# MOB DISC — Fleet server uptime · enterprise honesty · stop dying

**Status:** DISC 2026-07-11 — **`mob-fleet-health-degraded` APPLIED** · next: `mob-fleet-fatal-bind-exit`  
**Search:** server die, crash, uptime, enterprise, weak, vulnerable, restart, EADDRINUSE, kept alive  
**APPLY genre:** `mob-fleet-enterprise-uptime` (split into sub-MOBs below)  
**Related:** `MOB-DISC-FLEET-NO-GHOST-12H-RESTART.md`, `MOB-DISC-RISK-AND-DEBUG-PLAYBOOK.md`, `RESTART-FLEET.bat`

---

## Plain answer

**You are right to call this out.**

Today the **base is lab-grade process management**, not full enterprise HA. We can ship **professional ops software** on top, but we must **not pretend** a single Node window that sometimes half-dies is the same as Genetec/Milestone service tiers.

**Honest claim today:**

| Can say | Cannot say yet |
|---------|----------------|
| Windows **service** path with auto-restart (NSSM) for customer site | “Never goes down” |
| Structured logs + tech health panel | Multi-node HA / failover |
| Manual `RESTART-FLEET.bat` for lab | Self-healing after **broken bind** |
| 8-live cap, pool discipline | Process survives **any** error safely |

**UI polish (FR roster, tiles) does not fix a server that dies in the background.**

---

## What you have seen (real failures)

| Symptom | What actually happened |
|---------|------------------------|
| Dashboard dead / no live | Node process gone or port 3988 not listening |
| Restart fails `EADDRINUSE` | Old PID still holds 3988/5060/6000 — kill script failed (access / zombie) |
| “Server running” but no SIP/PTT/video | **Worst case:** process **kept alive** after bind errors |
| GPS / fleet weird after restart | Separate genre — `MOB-DISC-GHOST-KILL-HURT-LIVE.md` |
| 24h+ bat window “Server stopped” | Lab console mode — not a service |

From your session logs (2026-07-11):

```
uncaughtException — process kept alive | bind EADDRINUSE 0.0.0.0:5060
listen EADDRINUSE: address already in use 0.0.0.0:3988
```

**Process did not exit.** Subsystems failed. Operator sees a **zombie** — looks up, core is broken.

---

## Root causes (code-checked)

### 1 — “Keep alive” on fatal errors

```39:58:C:\Users\user\Desktop\Enterprise Mobility\ME8\server.js
process.on('uncaughtException', (err) => {
    log.web.err('uncaughtException — process kept alive', { ... });
});
process.on('unhandledRejection', (reason) => {
    log.web.err('unhandledRejection — process kept alive', { ... });
});
```

**Enterprise norm:** log + **exit** on uncaught (or exit if **critical listener** failed). Let **service supervisor** restart clean.

**Today:** swallow → half-dead server.

### 2 — Shallow health

`/api/health` returns `ok: true` + uptime only — **does not** report SIP bind fail, PTT down, pool stuck.

Tech panel (`/api/tech/health`) is better but **PIN-gated** — supervisors do not see degraded state on Centre Summary by default.

### 3 — Lab boot path

`RESTART-FLEET.bat` = console `node server.js` — close window = dead. No auto-restart unless IT installed **UbitronC2** Windows service (`INSTALL-UBITRON-SERVICE.ps1` → NSSM `AppExit Default Restart`).

**Lab ≠ ship.** Customer doc already says: operators use portal URL, not bat.

### 4 — Single monolith

One Node process: SIP + HTTP + Socket.IO + PTT WS + FTP + ffmpeg children + FR sidecar trigger. One bad leak or port fight affects **everything**.

### 5 — Port kill race

`kill-fleet-ports.ps1` stops LISTEN sockets — fails if PID is elevated/other user, or new instance starts before old dies.

---

## What enterprise VMS actually does

| Pattern | Ubitron today | Target |
|---------|---------------|--------|
| **Windows Service** auto-start + restart on crash | Script exists (NSSM) · lab uses bat | **Ship default = service** |
| **Deep health** (all listeners OK) | Shallow `/api/health` | `ok: false` when SIP/HTTP down |
| **Fatal bind → exit** | Keep alive | Exit code ≠ 0 → supervisor restarts |
| **Watchdog** (external ping) | None in lab | Optional Centre Summary alert |
| **Graceful shutdown** | Partial SIGTERM flush | Document + test |
| **Separate media/FR workers** | Partial (sidecar) | Genre 2+ — not blocking tier-0 uptime |

We do **not** need Kubernetes on day one. We need: **one reliable Windows service + honest health + no zombie process.**

---

## MOB plan (genre — apply in order)

| # | MOB | Files | Delivers | Risk |
|---|-----|-------|----------|------|
| **0** | **Use Windows service on bench** (operator/IT) | `INSTALL-UBITRON-SERVICE.ps1` | Auto-restart on crash — **no code** | 0 |
| **1** | **`mob-fleet-health-degraded`** | `server.js`, `lib/platformHealth.js` | `/api/health` + Centre strip: `ok`, `degraded`, `reasons[]` (SIP, HTTP, PTT, pool) | 2 | **APPLIED 2026-07-11** |
| **2** | **`mob-fleet-fatal-bind-exit`** | `server.js` | If HTTP **or** SIP cannot bind → log + `process.exit(1)` (not keep-alive zombie) | 3 |
| **3** | **`mob-fleet-startup-selfcheck`** | `server.js` | After listen: assert all ports; write `storage/startup-check.json` | 2 |
| **4** | **`mob-fleet-restart-harden`** | `kill-fleet-ports.ps1`, `RESTART-FLEET.bat` | Retry kill, UDP 5060, admin hint, exit code | 1 |
| **5** | **`mob-fleet-uptime-banner`** | `settings-hub.js` or header | Amber banner: “C2 degraded — SIP unavailable” when health fail | 1 |
| **6** | Later | split FR/media | Reduce blast radius | 4+ |

**Not in tier-0:** Redis, Postgres HA, k8s — see `ME8-ROADMAP.md` `mob-enterprise-compose` for future.

---

## Locked rules (after genre PASS)

| Rule | Detail |
|------|--------|
| **No zombie** | If dashboard port or SIP cannot bind → **exit**, not “kept alive” |
| **Health lies forbidden** | `ok: true` only when **all critical listeners** up |
| **Lab** | Bat OK for dev; **ship checklist** = service installed |
| **Restart** | `kill-fleet-ports` must free 3988+5060 or fail loud |
| **Operator** | Centre Summary / Settings shows **uptime + degraded** without tech PIN |

---

## What to tell customers (honest)

| Audience | Message |
|----------|---------|
| **Tender / RFP** | Single-server C2 with Windows Service, auto-restart, health monitoring, 8 concurrent live decode cap — **not** geo-redundant cluster |
| **Site IT** | Install `UbitronC2` service; monitor `http://host:3988/api/health`; logs in `storage/fleet.log` |
| **Ops** | If amber banner or health `degraded` → call IT; do not keep working on broken SIP |

---

## APPLY cheatsheet

```text
# IT once (bench or site):
.\INSTALL-UBITRON-SERVICE.ps1

# Code genre (one MOB at a time):
MOB-APPLY mob-fleet-health-degraded
MOB-APPLY mob-fleet-fatal-bind-exit
MOB-APPLY mob-fleet-restart-harden
```

---

## PASS checkpoint (genre)

| # | Test |
|---|------|
| 1 | Kill `node` → service restarts within ~10s (NSSM) |
| 2 | Start second instance → first exits or second fails **clean** — no zombie |
| 3 | `/api/health` → `degraded: true` when SIP port blocked |
| 4 | Centre / Settings shows amber when degraded |
| 5 | `RESTART-FLEET.bat` after service stop → ports free, one listener |

---

## FAQ

**Q: Can we claim enterprise today?**  
A: **Enterprise UX** — yes, improving. **Enterprise uptime SLA** — **not until** service + health + no-zombie MOBs PASS.

**Q: Why keep alive was added?**  
A: Lab survival during demos — avoids full crash on one bad handler. **Side effect:** zombie. Replace with **exit + service restart**.

**Q: Server “dies” — is it crash or zombie?**  
A: Check `storage/fleet.log` for `kept alive` + `EADDRINUSE`. Often **zombie**, not gone.

**Q: FR / UI MOBs related?**  
A: **No.** Separate genre. Finish FR Act 1b UI; **parallel** fleet uptime genre for ship credibility.

---

## Bottom line

| You said | Truth |
|----------|--------|
| Server dies sometimes | **Yes** — bat lab + keep-alive + port fights |
| Base vulnerable | **Fair** — tier-0 ops not hardened |
| Enterprise level? | **UI approaching** · **uptime not yet** |
| MOB DISC | **`mob-fleet-enterprise-uptime`** genre above |
| Fastest win | **Install Windows service** + **`mob-fleet-health-degraded`** + **`mob-fleet-fatal-bind-exit`** |
