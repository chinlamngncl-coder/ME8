# MOB DISC — Installation Guide wrote the wrong product (trial pack vs enterprise server)

**Date:** 2026-07-28  
**Status:** **REWRITE APPLIED 2026-07-28** — `MANUALS-V1-INSTALLATION-GUIDE-ENTERPRISE-REWRITE-V1` overwrote bat-first draft (operator review pending)  
**Search:** Installation Guide fail, bat install, professional server, Linux Windows, bundled Node, trial pack, 1-Pack  
**Operator:** PASS rejected on product positioning — “failed project” concern is **valid for that manual draft**

---

## Plain answer

You are **correct**.

The Installation Guide applied in `MANUALS-V1-INSTALLATION-GUIDE-V1` describes a **trial / desk eval pack** (double-click `Install-Ubitron.bat`, leave `Start Ubitron.bat` console open, talk about bundled Node.js). That is **lab and ship-smoke plumbing**, not the **professional Mobility Axiom server** you have been steering toward.

**Mobility Axiom is sold as an enterprise server product.**  
Customer IT installs a **service/daemon once**; operators use the **portal URL** only. They do not “run a bat every morning” or think about Node.

The manual draft **failed** because the agent copied the old `scripts/me8-ship/ph-kr-manuals-src/en/Installation-Guide.md` trial story instead of the **1-Pack + service + air-gap** story already on disk in code and discs.

---

## Your questions — direct answers

### 1) “Supported Windows PC” — I thought we are going for server setup? Linux? Windows?

**Yes — server deployment, not “any PC with bats.”**

| Platform | Enterprise intent (locked direction) | Today on disk (honest) |
|----------|-----------------------------------|-------------------------|
| **Windows Server** | IT installs **Windows service** (`Install-UbitronC2-Service.ps1` **`-Use1Pack`**), auto-start, no operator console | Script exists; default service path still often `server.js` unless `-Use1Pack`; not fully genre-PASS |
| **Linux** | **`systemd` unit** + dedicated user + `/opt/me8` + `me8-server` binary | `scripts/me8-ship/me8-server.service` exists; **no full install script yet** (per consolidate inventory) |
| **Lab / eval** | Zip + Install/Start bats for **ship desk smoke** and trial | Exists — **not** the canonical enterprise Installation Guide |

Installation Guide audience = **customer IT / installer on a server OS**, not “student unzips on laptop.”

Wording must be: **supported server platforms** (Windows Server + Linux), with a clear **enterprise install path** and an optional **appendix: eval pack smoke** if you still ship zips for trials.

---

### 2) Are we packing it?

**Yes — but pack ≠ product identity.**

| Layer | What it is |
|-------|------------|
| **Product** | Mobility Axiom server — 1-Pack boot, license gate, Setup tier, dashboard |
| **Customer pack** | Delivery zip built on ship desk (`BUILD-ME8-CUSTOMER`, license baked, protected `run.js`) — see `MOB-DISC-PACK-CONTROL-PER-CLIENT-20260725.md` |
| **Trial convenience** | Root `Install-Ubitron.bat` + `Start Ubitron.bat` for **first desk smoke** and eval — pre-ship gate still expects them in zip **root** for smoke |

**Professional Installation Guide** should read:

1. Prepare server (Windows or Linux)  
2. Deploy Mobility Axiom package to `/opt/me8` or `C:\Program Files\Mobility Axiom\` (vendor path)  
3. Install **service** (Windows `-Use1Pack` or Linux `systemd`)  
4. Apply **air-gap license** via Setup (PIN from log)  
5. Set deployment tier / network  
6. First admin sign-in + forced password change  
7. Hand off operators to portal URL  

**Not:** “Double-click Start every day.”

---

### 3) Why “Internet access on first install if Docker…”?

**For enterprise core install — it should not be required.**

That line belongs only to an **optional Video Conference SKU** appendix, and even then enterprise wording should be:

- **Preferred:** pre-staged Docker images / offline load on ship desk (air-gap sites)  
- **Not:** “you need internet on first install” as a main prerequisite  

Core Mobility Axiom (dashboard, SIP, evidence, licensing) must be documentable **without internet** after pack delivery — aligned with `FM_AIRGAP_LICENSE_REQUIRED` and license-on-HWID story.

**Agent error:** pasted trial VC install habits into the main guide.

---

### 4) “You do not need to install Node.js separately” — university project?

**Agreed — that sentence should not lead an enterprise Installation Guide.**

Facts:

- Ship pack **includes** bundled Node for trial zip convenience — implementation detail.  
- Enterprise doc should say **“Runtime is included in the delivery; do not install Node separately”** at most — one line in prerequisites, not a headline.  
- Better: **omit Node entirely** — IT installs **Mobility Axiom Server** service; runtime is vendor-managed inside the package.

**Bats + black console + “bundled Node”** together read as **class project**, not Genetec/Milestone/Axon tier. That is the branding failure you are pointing at.

Locked elsewhere: `MOB-DISC-FLEET-ENTERPRISE-UPTIME.md` — **“Lab ≠ ship. Customer doc: operators use portal URL, not bat.”**

---

## What went wrong (ownership)

| Mistake | Cause |
|---------|--------|
| Windows PC + bats as main flow | Copied PH/KR **trial** Installation-Guide.md |
| Ignored 1-Pack / Setup 13988 / tier | Consolidate inventory said manuals must catch 1-Pack — agent skipped |
| Ignored Linux systemd path | Unit file exists; agent did not read enterprise split |
| Internet + Docker in core prereqs | Trial VC script needs Docker pull — wrong layer for core guide |
| “Bundled Node” prominence | Trial pack truth, wrong tone for enterprise |

**`MANUALS-V1-INSTALLATION-GUIDE-V1` = APPLY done, product positioning = FAIL.**  
Do not treat operator “good. done” on file creation as PASS on **enterprise accuracy**.

---

## Correct manual model (locked for rewrite)

### A — Installation Guide (Enterprise) — canonical

**Audience:** Customer IT, data-centre installer, MSSP  
**Tone:** Cisco / Milestone / Genetec install guide — server OS, service, license, firewall, handoff URL  

**Must center:**

1. Supported **server** platforms (Windows Server + Linux)  
2. **1-Pack** entry (`me8-server` / packaged binary when ship proves it)  
3. **Windows service** install with `-Use1Pack` OR **Linux systemd** enable  
4. **Setup Mode** (127.0.0.1:13988, PIN from log, license upload, deployment tier)  
5. **Air-gap license** — no internet required for core  
6. First sign-in / forced password change (already locked MOB)  
7. Operator handoff: **portal URL only**  
8. Optional appendices: Video Conference (Docker), Face Analytics (Python) — **SKU optional**, offline notes  

**Must NOT center:**

- `Start Ubitron.bat` as daily operations  
- Black console window as normal operations  
- Bundled Node as a selling point  
- “University zip extract” as the only story  

### B — Eval / trial pack appendix (optional short doc or Tech appendix)

- Install bat + Start bat **once** for ship desk smoke  
- Explicit label: **“Evaluation and ship verification only — not production operations”**  
- Points to Enterprise Installation Guide for real sites  

---

## Code vs docs gap (honest — not an excuse)

Enterprise **direction** is in code (1-Pack, gatekeeper, tier, service script, Linux unit).  
Enterprise **install genre** is **not finished**:

- `-Use1Pack` service not default PASS genre  
- Linux install script missing  
- `pkg` / `me8-server.exe` ship binary not proven end-to-end  

So the **rewrite MOB** must document **target enterprise truth** and mark **platform gaps** where install automation is still lab-only — same honesty as `MOB-DISC-FLEET-ENTERPRISE-UPTIME.md` (“do not pretend”).

---

## Recommended next MOB (one name)

### `MANUALS-V1-INSTALLATION-GUIDE-ENTERPRISE-REWRITE-V1`

**Scope:**

1. Replace or heavily rewrite `Installation/EN/Installation Guide.rtf` per model **A** above.  
2. Move bat-first trial flow to appendix **B** (or delete from Installation Guide and leave in ship-internal smoke doc only).  
3. Cross-link Technical Manual for 6-phase Server Config, Glass Fortress, ports.  
4. Update `MOB-DISC-MANUALS-V1-GENRE-QUEUE-NEXT.md` — Installation Guide status = **FAIL until enterprise rewrite PASS**.

**Out of scope:** Building Linux install script or proving `me8-server.exe` — product MOBs, not manual-only fiction.

---

## Agent must NOT

- Defend bat-first Installation Guide as “professional server” docs.  
- Tell enterprise customers to use `Start Ubitron.bat` as normal operations.  
- Put internet in core prerequisites.  
- Lead with bundled Node.  
- Mark Installation Guide PASS without operator read against **server install** intent.

---

## Record

| Item | Result |
|------|--------|
| Operator concern | Installation Guide reads like trial/university pack, not sold server |
| Verdict | **Valid FAIL** on positioning |
| Wrong source | Trial `ph-kr-manuals-src` Installation-Guide.md |
| Right source | 1-Pack + service + air-gap discs + `IT-ADMIN-MANUAL.md` + consolidate inventory |
| Next APPLY | `MANUALS-V1-INSTALLATION-GUIDE-ENTERPRISE-REWRITE-V1` |
