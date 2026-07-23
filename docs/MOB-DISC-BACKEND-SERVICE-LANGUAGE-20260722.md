# MOB DISC — Backend service language

**Status:** DISC locked — facts only (no APPLY)  
**Date:** 2026-07-22  
**Trigger:** Operator — what language is the **backend** / backend service?

---

## One-sentence answer

**The Mobility Axiom / ME8 backend service is JavaScript, running on Node.js.**

Entry point: `server.js` (`npm start` → `node server.js`). Package name in repo: `fleet-backend`.

---

## What “backend” means here

| Piece | Role | Language |
|-------|------|----------|
| **Fleet backend service** | HTTP API, auth, Socket.IO, SIP/PTT glue, SOS, dispatch groups, device control | **JavaScript (Node.js)** |
| Modules under `lib/` | Same process — helpers the server loads | **JavaScript** |
| Express + Socket.IO + `sip` / `ws` / `pg` / Redis client | Libraries the Node process uses | Still **Node.js / JS** |

There is **no** separate Python/Java “main backend” for dashboard/PTT/Call. Those features live in this Node service.

---

## Not the backend (don’t confuse)

| Thing | Language | Why it’s not “the backend” |
|-------|----------|----------------------------|
| Browser UI (`public/`) | HTML / JS | **Frontend** |
| JSON locale / config files | JSON | Data, not the service runtime |
| FR sidecars (`fr-sidecar*`) | Python | Optional face engine beside Fleet |
| WVP / ZLM (Docker) | Their own stacks | Media products Fleet talks to |
| Postgres / Redis | SQL / Redis protocol | Storage — not app logic language |

---

## How you start it (lab)

Same as today: lab Start / `node server.js` — that **is** the backend service.

---

## Related

Broader stack (UI + FR + JSON): `MOB-DISC-WHAT-LANGUAGE-IS-ME8-20260722.md`

No APPLY from this disc.
