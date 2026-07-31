# MOB DISC — Should customer manuals discuss Docker?

**Date:** 2026-07-29  
**Status:** **PASS 2026-07-29** — `MANUALS-V1-TECH-DOCKER-SUPPORTING-SERVICES-V1` in `Tech/EN/Technical Manual.rtf` v2.1  
**Operator review:** **PASS**  
**Search:** Docker Desktop, container engine, LiveKit, WVP, ZLM, ship pack docker folder, manuals Docker  
**Related:** Installation Guide PASS · Technical Manual v2.0 · `MOB-DISC-MANUALS-V1-INSTALLATION-GUIDE-ENTERPRISE-FAIL.md`  
**Product brand in customer text:** Mobility Axiom only (never teach “ME8 docker lab”)

---

## Plain answer

**Yes — but only in the right place, with the right depth.**

| Manual | Discuss Docker? |
|--------|-----------------|
| **Installation Guide (core on-prem)** | **No** as a main prerequisite for every site. Optional one sentence only if this order’s cover letter says supporting media services are included. |
| **Technical Manual** | **Yes** — short, professional chapter: what runs where, what must stay running, what IT checks when video/VC fails. |
| **User / Quick Start** | **No** (operators never open Docker). One line only if VC fails: “Ask IT — supporting conference service may be stopped.” |
| **VC / optional SKU appendix** | **Yes** — when Video Conference is licensed. |

Do **not** turn the Installation Guide back into the trial story (“install Docker Desktop, wait for the whale icon”).

---

## How it works in *our* system (honest)

### Three different things people confuse

| Thing | What it is | Customer sees? |
|-------|------------|----------------|
| **A. Mobility Axiom server service** | Main product on Windows/Linux (dashboard, Settings, SIP path, evidence, license) | Yes — this is what Installation Guide installs |
| **B. Docker Engine** | OS-level **container engine** (Docker Desktop on many Windows packs, or Docker Engine on Linux Server) | Only if IT must install/maintain it |
| **C. Containers inside Docker** | Supporting apps Ubitron ships under the pack `docker/` folder (examples: LiveKit for Video Conference; WVP/ZLM media stack in lab/ship designs; optional database helpers) | Normally **no UI** for operators; IT may see them in Docker when troubleshooting |

**Important:** Shipping a `docker/` folder in the pack is **not** the same as “Docker is already installed on the customer OS.”  
The pack carries **compose/config (and often pre-staged images)**. The **engine** must already exist on the machine — unless Ubitron delivers a **pre-built server image** where Engine + containers are already set to auto-start.

### Does Docker run forever in the background?

**Yes — when those supporting containers are part of the site design:**

1. **Docker Engine** should start when the server boots (Windows service / Linux service, or Docker Desktop “Start when Windows starts”).  
2. **Containers** that Ubitron enables for that site should use auto-restart (so after reboot they come back without clicking).  
3. IT does **not** start Docker by hand every morning in a good enterprise install.  
4. If Engine is stopped, **Mobility Axiom service may still start**, but **Video Conference** (and any media stack that depends on those containers) will fail until Engine + containers are running again.

**Operators** never babysit Docker. **IT** only opens it when a licensed module that needs containers is down.

### What needs Docker today (product truth)

| Capability | Needs container engine? | Notes for manuals |
|------------|-------------------------|-------------------|
| Core dashboard, Setup, license, users, evidence paths, many Settings | **No** | Installation Guide stays service-first |
| **Video Conference** (LiveKit) | **Yes** | Trial/ship scripts already require Docker running; keep this in **optional / VC** docs |
| **Live body-worn video stack** (WVP/ZLM containers in current lab/ship designs) | **Yes, when that stack is how the site is shipped** | Tech Manual: “supporting media services”; do not dump lab bat names |
| Optional enterprise DB helpers in compose | **Sometimes** | Only if that site’s README says so |

`bin/me8-server.js` does **not** replace Docker. The main app service and the container engine are **partners**, not one process.

---

## Do enterprise vendors discuss Docker?

**Yes — when the product depends on it. No — when it does not.**

| Pattern | Example |
|---------|---------|
| Core VMS admin manual | Usually **does not** lead with Docker (Milestone / Genetec Security Center core = Windows services, SQL, etc.) |
| Component that **hosts containers** | Vendor **does** document the container engine (e.g. Genetec Inter-System Gateway: install container runtime, keep it running, certificates) |
| Optional module | Documented in module guide / appendix, not as step 1 of every install |

**Our match:**  
Mobility Axiom core = **service**.  
Docker = **supporting platform** for specific stacks/SKUs — document like Genetec documents a container engine for a gateway: short, required when used, not a hobbyist whale tutorial in the main install path.

---

## Will the client “know” if we pre-install Docker in the pack?

Depends what “pre-install” means:

| Delivery model | What client should know |
|----------------|-------------------------|
| **Software zip + customer IT installs on their Windows Server** | They must know if Engine is required for their SKUs. README / Tech Manual must say so. Pack `docker/` files alone do not install Engine. |
| **Ubitron appliance / pre-imaged server** (Engine + containers already auto-start) | Installation Guide can say: supporting media services start with the server. Client may **never** open Docker UI. Tech Manual still explains “if live video / conference fails, IT verifies supporting services are running.” |
| **Trial / eval desktop pack** | Old manuals taught Docker Desktop + whale icon — **wrong tone for enterprise Installation Guide** (already FAIL-locked). Keep eval notes out of the PASS Installation Guide. |

**Recommendation for Ubitron sales/ship desk:** Prefer **appliance or pre-imaged** hosts for production so customers are not asked to become Docker administrators. Manuals still tell truth for IT recovery.

---

## Decision (one path)

### Locked customer wording strategy

1. **Installation Guide (PASS — do not reopen for Docker headlines)**  
   - Keep service install / Setup / license / first admin.  
   - Do **not** add “Install Docker Desktop” as a core chapter.  
   - Optional cover-letter line only: “If your order includes Video Conference or Ubitron media services, supporting components are described in the Technical Manual.”

2. **Technical Manual — add a dedicated short chapter (next wording APPLY)**  
   Title suggestion: **Supporting services (container engine)**  
   Must cover, in plain English:  
   - Mobility Axiom service vs supporting containers  
   - When Engine is required (VC licensed; media stack as shipped)  
   - Engine must start at boot; containers must stay running  
   - IT check when VC or live video stack fails  
   - Never use Docker/WSL **172.17–172.31** as Device registration IPv4  
   - Point to package README for exact start commands for this order  
   - **No** lab bat diary, **no** “whale icon” as the enterprise voice (Desktop UI may appear once as Windows Desktop note if that is how the pack is built)

3. **User Manual**  
   - No Docker chapter.  
   - VC troubleshooting: contact IT.

4. **Forbidden**  
   - Pretending core product “is Docker”  
   - Pretending customers never need Engine when VC/media containers are required and not appliance-prebaked  
   - Teaching customers to pull random images from the public internet as the main enterprise path (prefer pre-staged / air-gap load)

---

## How to explain it to a non-technical owner (one paragraph)

Mobility Axiom itself is a normal Windows/Linux **service**, like other enterprise server software. Some advanced pieces (especially Video Conference, and on many sites the live camera media helpers) run in small **supporting programs** managed by a **container engine**. That engine should start when the server starts and stay on in the background. Dispatch staff never touch it. IT only checks it if conference or live video helpers stop. If Ubitron delivered a ready server image, those pieces may already be set to auto-start and the customer may never open a Docker screen.

---

## APPLY name (when ready to edit manuals)

`MANUALS-V1-TECH-DOCKER-SUPPORTING-SERVICES-V1`

**Scope:** Add Technical Manual chapter (Supporting services / container engine) only — do not rewrite Installation Guide core path.  
**Out of scope:** Changing product auto-start behaviour; inventing a new Docker UI in Axiom.

---

## Operator questions this disc answers

| Question | Answer |
|----------|--------|
| Shall we discuss Docker? | **Yes in Tech Manual (short).** Not as Installation Guide chapter 1. |
| Do enterprises discuss it? | **Yes when required**; not as the face of the whole product. |
| Pack includes docker folder — client knows? | **Folder ≠ Engine installed.** Tell IT in Tech/README; appliance model can hide it. |
| Forever in background? | **Engine + required containers should auto-start and stay running.** Not a daily operator click. |

---

## Lock record

| Item | Decision |
|------|----------|
| Core install story | Service-first (unchanged) |
| Docker in customer docs | Tech Manual supporting-services chapter |
| VC | Document Engine requirement when licensed |
| Operator manuals | No Docker curriculum |
| Next | Operator PASS this disc → then `MOB-APPLY MANUALS-V1-TECH-DOCKER-SUPPORTING-SERVICES-V1` |
