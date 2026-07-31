# MOB DISC — Manuals V1 professional replan (enterprise server, license, deployment split)

**Date:** 2026-07-28  
**Status:** **LOCKED REPLAN** — stop writing customer manuals until this plan PASS  
**Search:** manuals fail, professional server, license HWID, deployment split, hybrid cloud, ports, setup, 6-phase  
**Operator:** Valid complaint — current Manuals V1 drafts do **not** reflect work from the last ~7 days; treating them as PASS would flush real product progress “down the drain.”

---

## Plain answer

**Got it.**

The manuals genre so far is **not professional enough** and **not aligned** with what Mobility Axiom actually is now:

- An **enterprise server** product (Windows Server + Linux service), not a “double-click bat” trial zip story.  
- A **license-gated** product — customer IT sends **Hardware ID to Ubitron** → Ubitron returns signed **`license.lic`** (and platform caps) → customer installs on **that server only**.  
- A **deployment-tier** product — LAN, WAN edge, **Ubitron managed cloud**, and **hybrid** are **different installation stories**, not one vague paragraph and not “customer DIY cloud” wording.  
- A product with **Setup Mode** (localhost `:13988`, PIN from log), **6-phase Server Config**, **Glass Fortress** recovery, **SIP bridge**, correct **ports and real LAN IP** rules.

**Stop** patching one lousy Installation RTF copied from trial ship docs.  
**Start** a **split manual family** mapped to deployment model + role, fed from **code truth + Jul 26–28 MOBs**.

---

## Why the operator is right (failure summary)

| What you named | What manuals got wrong |
|----------------|------------------------|
| Server vs “Windows PC” | Framed as desk PC + bats, not Windows Server / Linux **service** |
| License “send to Ubitron, get code back” | Omitted or implied “license already in zip” only — **missing customer request workflow** |
| IP / setup / ports | Generic or trial values; missing Setup `:13988`, dashboard `:3988`/HTTPS, SIP **5060** vs bridge, msg `:6000`, VC `:7880`, **never 172.x**, preferred LAN script |
| Cloud mention | Wrong layer — **Ubitron Cloud** is **your** managed offering (few client steps or fully provisioned by Ubitron), not “customer installs cloud edition from zip” |
| “Many many more mistakes” | Jul 26–28 product work largely **absent** from Manuals V1 (see inventory below) |
| Professional standard | Reads trial / university, not Milestone / Genetec / Axon install tier |

**Verdict:** Manuals V1 genre = **FAIL / REPLAN REQUIRED**.  
Individual MOBs (first-login PASS, Installation Guide V1) do **not** rescue the genre without this plan.

---

## What we actually built (Jul 26–28) — manuals MUST cover

These are **not optional appendix** — customer IT and operators need them in the right manual type.

### A) Secure boot & Setup (Track 2 / Glass Fortress)

| Built | Manual must say |
|-------|-----------------|
| `bin/me8-server.js` 1-Pack entry | Production boot path; lab `node server.js` is dev only |
| Setup-only on **127.0.0.1:13988** (default) | Localhost only; PIN from log; WAN blocked |
| Setup PIN gate (`setupOnlyServer.js`) | 6-digit PIN each boot; `service-stdout.log` |
| `setup-boot.html` — HWID display, `license.lic` upload, tier save | Step-by-step with screenshots |
| Glass Fortress 3-line faults | WHAT / WHY / HOW — `IT-ADMIN-MANUAL.md` already started |
| Clock sanity (`timeAnchor.js`) | BIOS/CMOS recovery path |
| Port bind retry + EADDRINUSE | Conflict recovery |
| SIP bridge cascade (`sipBridge.js`) — **listen 5060**, not Fleet 5062 | **Critical** — wrong port doc breaks live video |
| Windows service `-Use1Pack` | IT install once; operators use URL only |
| Linux `me8-server.service` | Target path; install script gap noted honestly |

**Disc:** `MOB-APPLIED-8-GLASS-FORTRESS-CONSOLIDATION-V6-20260728.md`

### B) Licensing & entitlements (Phase 3)

| Built | Manual must say |
|-------|-----------------|
| `license.lic` Ed25519 HWID lock | Request → issue → install workflow |
| `npm run license:print-hwid` / Setup HWID display | Customer copies ID, emails Ubitron / portal |
| `tools/generate-license.js` + **license-ui CRM** (127.0.0.1:3917) | **Ubitron internal only** — never in customer zip |
| `platform-license.json` (BWC/user caps) | May ship with pack; separate from `.lic` |
| Feature entitlements (8.3): PTT, redaction, analytics, VC, tactical, **CAD** | Licensed vs locked UI (padlock) |
| `FM_AIRGAP_LICENSE_REQUIRED=1` on real ship | Core can run air-gap after `.lic` delivered |

**Disc:** `MOB-DISC-LICENSE-SHIP-TEST-AND-GREYOUT-STORY-20260725.md`, `LICENSE-OPERATIONS.md`

### C) Settings & auth (Jul 26–27)

| Built | Manual must say |
|-------|-----------------|
| **6-phase Server Config**: Identity, Networking, Access & Security, Storage & Devices, Resiliency, Diagnostics | Replace all “12 tabs / vague network section” wording |
| Dashboard auth overhaul, dispatch scope chips, user cards | Tech admin + User sign-in sections |
| Unified Settings theme / enterprise grid | Screenshot placeholders per phase |
| First-login forced password change | **PASS** in User/Quick Start/Tech — keep |

### D) Network deployment tier

| Tier in Setup UI | Customer meaning (installation doc) |
|------------------|-------------------------------------|
| **LAN-Only** | On-prem; operators on private LAN; firewall private ranges |
| **WAN (Public Edge)** | Customer hosts server; public HTTPS edge; reverse proxy / certs |
| **Cloud-Hosted** | **Ubitron-managed cloud** — customer does **not** self-install a “cloud server” from zip; see **Managed Cloud Installation** manual |
| **Hybrid** | Local edge (recorders/SIP/video) + Ubitron cloud or central portal — **split responsibilities** doc |

**Do not** tell a generic “pick cloud” story in the on-prem Installation Guide.  
**Do** split manuals by **who runs the server**.

**Disc:** `MOB-DISC-3-NETWORK-TIER-AUTOMATION-20260727.md`

---

## License workflow — customer-facing (must be explicit)

Professional products document this as its own chapter or short **License Guide**.

### Customer IT (on-prem install)

1. Install Mobility Axiom Server package on target server (service).  
2. Boot enters **Setup Mode** (or full app with missing license → Setup).  
3. Open **http://127.0.0.1:13988** on the server (SSH/RDP tunnel if remote admin).  
4. Read **Setup PIN** from log (`[ACTION REQUIRED] Setup Mode Active. Web UI PIN:`).  
5. Copy **Hardware ID** shown on Setup page.  
6. Send HWID + contract reference to **Ubitron** (email / support portal / sales engineer).  
7. Ubitron (offline) signs **`license.lic`** for that HWID + entitlements + expiry.  
8. Customer receives **`license.lic`** (attachment or secure download) — **not** a “license code” typed into a field unless you later add that UX; today it is a **file**.  
9. Upload **`license.lic`** on Setup page → save deployment tier → restart service.  
10. First admin sign-in → **forced password change** (locked MOB).  

### Ubitron internal (never customer manual body)

- `tools/license-ui` CRM, `generate-license.js`, private key, `LICENSE-OPERATIONS.md`, ship desk guide.  
- Customer manual only says: **“Contact Ubitron with your Hardware ID.”**

---

## How others split installation (benchmark — plan against this)

| Vendor pattern | On-prem | Cloud / SaaS | Hybrid |
|----------------|---------|--------------|--------|
| **Genetec** | Security Center server install guide | Genetec Clear / cloud service — separate doc, Ubitron provisions | Federation / bridge docs separate |
| **Milestone** | XProtect server + recording server install | Arc / cloud — subscription provisioning | Edge + cloud linking guide |
| **Axon** | Fleet/local components | Evidence.com cloud — tenant URL, minimal client steps | Agency cloud + devices |

**Mobility Axiom plan (locked direction):**

| Manual | Audience | Covers |
|--------|----------|--------|
| **Installation Guide — On-Premises** | Customer IT | Server OS, service install, Setup, license upload, tier **LAN** or **WAN edge**, first smoke |
| **Installation Guide — Ubitron Managed Cloud** | Customer IT + Ubitron PS | Tenant URL, DNS, IdP if any, **few steps** OR **fully provisioned by Ubitron** per subscription — **no bat zip story** |
| **Installation Guide — Hybrid** | Customer IT + Ubitron PS | What stays on-site (SIP, BWCs, edge video) vs what runs in Ubitron cloud; firewall between; handoff checklist |
| **Technical Reference Manual** | Customer IT | 6-phase Server Config, ports matrix, firewall, SIP/BWC, evidence storage, Glass Fortress, logs, VC/FR optional SKUs |
| **User Manual** | Operators | Daily use (existing genre — needs UI sync PASS) |
| **Quick Start Guide** | Operators | First day after IT handoff |
| **Migration Guide** | Customer IT | Upgrade path, stop old service, license move, password policy |
| **Release Notes** | All | Per version (ship genre) |

**Eval / trial zip** (`Install-Ubitron.bat` / `Start Ubitron.bat`): **Ship Desk Verification Guide** (internal or appendix) — **not** titled “Installation Guide” for enterprise.

---

## Ports & IP — single source of truth for Technical Reference

Manuals must not invent ports. **Technical Reference** carries the matrix; Installation only references it.

| Purpose | Default / typical | Notes for docs |
|---------|-------------------|----------------|
| Setup UI | **13988** (HTTPS **13989**) | **127.0.0.1 only**; PIN required |
| Dashboard HTTP | **3988** (lab `.env.example` may show 3888 — doc **customer ship default 3988** unless contract says otherwise) | Real LAN IP in browser; not localhost for operators |
| Dashboard HTTPS | **4438** (typical) | WAN edge / reverse proxy |
| SIP (devices register) | **5060** | BWC SIP server IP = **real Wi‑Fi/Ethernet IPv4** |
| SIP bridge listen | **5060** cascade | **Not** Fleet Settings sipPort (5062) — hotfix 2026-07-28 |
| Message WebSocket | **6000** | Device messaging |
| LiveKit / VC | **7880** (+ UDP WebRTC range) | Optional SKU; offline image staging for air-gap |
| FTP evidence | **2121** (+ passive range) | Storage phase |
| WVP / media | per deployment | Tech matrix T-12 |

**IP rules (locked):**

- Use **`Get-UbitronPreferredLanIPv4.ps1`** logic — skip WSL/Docker **172.17–172.31**.  
- **`HOST`**, **`FM_GB28181_PUBLIC_HOST`**, BWC SIP server IP, and “Type on BWC” must match **same real LAN IPv4**.  
- Never document 172.x, localhost, or `203.0.113.10` for device registration.

---

## Current Manuals V1 file status (honest)

| File | Status |
|------|--------|
| `00 - Manual Format Standard.rtf` | Needs update — deployment split + license chapter rule + forbid bat-as-enterprise |
| `User/EN/User Manual.rtf` | Partial — first-login PASS; missing Jul 26–27 Settings/auth alignment |
| `Quick Start/EN/Quick Start Guide.rtf` | Partial — first-login PASS; operator handoff only after IT doc PASS |
| `Tech/EN/Technical Manual.rtf` | **Stale** — vague Server Config; missing 6-phase, bridge, tier, entitlements, accurate ports |
| `Installation/EN/Installation Guide.rtf` | **REWRITE 2026-07-28** — on-prem enterprise (`MANUALS-V1-INSTALLATION-GUIDE-ENTERPRISE-REWRITE-V1`). If Word had the old file locked, open `Installation Guide - ENTERPRISE-REWRITE.rtf` until overwrite completes. |
| `docs/IT-ADMIN-MANUAL.md` | Good **seed** for Technical Reference appendix — should migrate into Manuals V1 Tech, not live alone in `docs/` |

---

## Manual genre queue — REPLACED (do not follow old order blindly)

| Phase | MOB | Output |
|-------|-----|--------|
| **0** | **`MANUALS-V1-PROFESSIONAL-REPLAN-PASS-V1`** | Operator reads **this disc** + approves manual family table |
| **1** | `MANUALS-V1-FORMAT-STANDARD-V2` | Format standard: split by deployment + role; license workflow mandatory |
| **2** | `MANUALS-V1-LICENSE-REQUEST-GUIDE-V1` | Customer: HWID → Ubitron → `.lic` → Setup upload |
| **3** | `MANUALS-V1-INSTALL-ONPREM-V1` | Enterprise on-prem (Windows service + Linux unit); **no bats** |
| **4** | `MANUALS-V1-INSTALL-MANAGED-CLOUD-V1` | Ubitron cloud subscription path (few steps / Ubitron-provisioned) |
| **5** | `MANUALS-V1-INSTALL-HYBRID-V1` | Split responsibilities + network |
| **6** | `MANUALS-V1-TECH-REFERENCE-V2` | 6-phase, ports matrix, Glass Fortress, SIP bridge, firewall by tier |
| **7** | `MANUALS-V1-USER-QUICKSTART-SYNC-V1` | Align to live UI + entitlements padlock |
| **8** | `MANUALS-V1-MIGRATION-V1` | Ship genre |
| **9** | Screenshots + PDF export | After wording PASS |

**Do not APPLY phase 3–7 until phase 0 PASS.**

---

## Agent must NOT (locked)

- Write another “Installation Guide” by copying `scripts/me8-ship/ph-kr-manuals-src`.  
- Present **bat + bundled Node** as the enterprise story.  
- Put **customer self-install cloud** in the same doc as on-prem without Ubitron managed distinction.  
- Omit **license request → Ubitron → file return** workflow.  
- Document SIP on wrong port (5062) or WSL IP.  
- Mark Manuals V1 PASS while Jul 26–28 product surfaces are missing.  
- Bundle on-prem + cloud + hybrid + tech + license into **one MOB**.

---

## Operator PASS for replan (not for drafts)

1. Manual family table above matches how **you** sell (on-prem / Ubitron cloud / hybrid).  
2. License story matches how **customers** actually get `license.lic` today.  
3. Cloud doc = **Ubitron managed**, not DIY cloud zip.  
4. Then name first APPLY: **`MANUALS-V1-FORMAT-STANDARD-V2`** or **`MANUALS-V1-LICENSE-REQUEST-GUIDE-V1`**.

---

## Record

| Item | Result |
|------|--------|
| Operator | “Lousy manual”; many gaps; license; IP/ports/setup wrong; split deployment types |
| Verdict | **Valid — full genre replan** |
| Supersedes | Naive queue in `MOB-DISC-MANUALS-V1-GENRE-QUEUE-NEXT.md` for phases 1+ |
| Keeps | First-login PASS MOB; `IT-ADMIN-MANUAL.md` as Tech seed |
| Related | Enterprise fail disc, consolidate inventory, license ship story, Glass Fortress V6, 3-network-tier, **`MOB-DISC-MANUALS-V1-PORTS-CONFIGURABLE-VS-DEFAULTS.md`** |
