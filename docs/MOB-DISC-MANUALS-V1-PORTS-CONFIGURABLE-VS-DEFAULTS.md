# MOB DISC — Ports: already configurable in product; manuals must explain how (not “fix ports now”)

**Date:** 2026-07-28  
**Status:** DISC — locked clarification for manual replan  
**Search:** ports change, SIP port, dashboard port, operator URL, Settings, defaults, read-only  
**Trigger:** Operator — “We already did client can change ports — why are you fixing it now? Shouldn’t there be explanation too?”

---

## Plain answer

**Yes — you already built this.**  
The agent is **not** changing product ports in this disc. The mistake was writing manuals as if ports are **fixed forever**, without explaining **what IT can change in Settings**, **what needs install/env + restart**, and **what operators actually use** (Operator portal URL).

**Manuals must explain port behaviour — not invent new port policy.**

---

## Confirm: what is already in the product (code truth)

### A) Customer **can change in Settings → Server Config** (super admin)

| Setting | UI | Saved to | Notes |
|---------|-----|----------|-------|
| **SIP port** (BWC registration) | Networking / Protocol — `SIP port` (`#ss-sip-port`) | `server-settings.json` via `POST /api/server-settings` | Range **1024–65535** (Glass Fortress sanitize, 2026-07-28) |
| **BWC server IPv4** | Device registration / public host | same | Must be real LAN IP — **never 172.17–172.31** |
| **Operator portal URL** | Access & Security — bookmark URL for dispatch | same | e.g. `https://dispatch.customer.com` — **can hide port** behind reverse proxy on **443** |
| **Trust reverse proxy** | Access & Security | same | When nginx/Caddy terminates TLS in front |
| **Deployment mode** | Identity / deployment sections | same | Lab / LAN / Cloud / Hybrid labels in Settings |
| **SIP password, realm, media transport** | Protocol section | same | Affects “Type on BWC” checklist |
| **Site timezone, FTP paths, BWC list** | Storage & Devices | same | Related but not “ports” |

**Product copy already warns:**  
`server.restartNote` — *“After saving network or SIP changes in Server Config, restart Mobility so cameras and operators pick up the new details.”*

**Disc:** `MOB-DISC-NETWORK-SETTINGS-NO-ENGINEER-MIRACLE-20260723.md` — network basics belong in Settings, not “phone an engineer.”

---

### B) Shown read-only in Settings (change at **install / `.env` + service restart**)

| Port | UI | How IT changes |
|------|-----|----------------|
| **Dashboard HTTP listen** | “Dashboard port” read-only (`#ss-runtime-http-port`) | `FM_HTTP_PORT` in `.env` (or ship pack bake-in) → **restart service** |
| **Dashboard HTTPS** | Runtime snapshot / TLS readiness | `FM_HTTPS_ENABLED`, `FM_HTTPS_PORT` (typical **4438** lab) → restart |
| **Setup UI** | Not on dashboard Settings | `SETUP_PORT` (default **13988**, localhost only) — install / 1-Pack; auto-bump if collision |
| **Video / audio WebSocket** | Firewall checklist (derived) | Tied to HTTP port (+1, +2) — changes when `FM_HTTP_PORT` changes |
| **PTT, FTP passive range, VC LiveKit** | Firewall checklist rows | Mostly `.env` / optional SKU — documented in **Technical Reference**, not daily UI toggles |

**This is intentional product design today** — not a manual invention:

- **Operator-facing door** = **Operator portal URL** (editable).  
- **Raw listen port** = install-time / env (read-only in UI).  
- Industry-normal for apps behind reverse proxy (see question 3 in network-settings disc).

**Disc:** `MOB-DISC-HTTPS-PRODUCT-VS-LAB-PORTS-PLAIN-20260723.md` — ship goal = **one HTTPS URL**, not weekly port hobby; lab may show **3988 + 4438** while finishing.

---

### C) Firewall checklist (already dynamic — follows Settings)

`lib/serverSettings.js` → `firewallChecklist()` builds rows from **live settings + runtime snapshot**:

- Dashboard HTTP/HTTPS (from runtime)  
- Live video/audio WS  
- **BWC SIP** — uses **`settings.sip.sipPort`** (what customer changed)  
- Message Center WS  
- RTP ranges, PTT, FTP, VC when enabled  

**Manuals should point IT to Settings → firewall/readiness checklist** — not a static table that ignores their SIP port choice.

---

## What the agent got wrong in manual replan

| Agent mistake | Truth |
|---------------|-------|
| Listed ports as if **fixed defaults only** | Defaults exist for **greenfield install**; **SIP port and operator URL are customer-configurable** |
| Implied we are **“fixing ports now”** in product | **No.** Only manual wording was wrong |
| Omitted **change procedure** | Manuals must document: change in Settings → Save → **restart service** → update **Type on BWC** on each camera → update **firewall** |
| Mixed **internal SIP bridge (5060)** with **BWC SIP port (Settings)** | Hotfix 2026-07-28: bridge listen cascade **5060** is internal; **BWC still registers to Settings `sipPort`** — Tech Reference must explain both layers without telling customer to “use 5060” blindly |

---

## How professional manuals should explain ports (locked)

### Technical Reference — chapter: **Ports and network doors**

Three concepts — **never confuse**:

1. **Operator portal URL** — what dispatch staff bookmark (`https://…`). Editable in Settings. May be port **443** via customer reverse proxy while server listens on **4438** internally.  
2. **Device registration (SIP)** — IPv4 + **SIP port** from Settings + “Type on BWC” checklist. **Customer can change SIP port** if firewall/site requires it.  
3. **Install-time listen ports** — dashboard HTTP/HTTPS, Setup localhost port — from **install profile / `.env`**, shown read-only in Settings; change = IT + **service restart**, documented in install guide appendix.

Include:

| Section | Content |
|---------|---------|
| **Defaults table** | Greenfield ship values (3988, 4438, 13988 Setup, 5060 typical SIP, 6000 msg, …) labeled **“default if unchanged”** |
| **Change in Settings** | Step-by-step: SIP port, operator URL, trust proxy; cite `server.restartNote` |
| **Change at install** | When IT must set `FM_HTTP_PORT` before first production start |
| **After any port change** | Restart service → verify firewall checklist → re-enter on **each BWC** → test one online device |
| **What not to do** | Do not use WSL/Docker 172.x; do not change BWC to match internal bridge port by guess |

### Installation guides

- Mention **default** operator URL pattern once.  
- Say: **“Final ports and URLs are set in Server Config after install — see Technical Reference § Ports.”**  
- Do **not** imply ports are permanent from the zip.

### User / Quick Start

- Operators use **Operator portal URL** from IT — **not** raw `:3988` unless IT said so.

---

## Relationship to other discs

| Disc | Link |
|------|------|
| `MOB-DISC-MANUALS-V1-PROFESSIONAL-REPLAN-V1.md` | Tech Reference owns port chapter; replan “ports matrix” = **defaults + configurable columns**, not fixed-only |
| `MOB-DISC-NETWORK-SETTINGS-NO-ENGINEER-MIRACLE-20260723.md` | Settings is the control surface |
| `MOB-DISC-HTTPS-PRODUCT-VS-LAB-PORTS-PLAIN-20260723.md` | One HTTPS URL at ship; lab dual-port is temporary |
| `MOB-APPLIED-8-GLASS-FORTRESS-CONSOLIDATION-V6-20260728.md` | SIP port validation; bridge vs Fleet port |
| `MOB-DISC-TWO-BWC-TWO-SIP-HOMES-NO-FORCE-5060-20260719.md` | Do not force all BWCs to one port as homework |

---

## Manual MOB adjustment (when APPLY resumes)

Add to **`MANUALS-V1-TECH-REFERENCE-V2`** scope (or dedicated **`MANUALS-V1-TECH-PORTS-AND-URLS-V1`**):

1. Defaults vs configurable vs read-only table  
2. Settings change procedure + restart  
3. Operator URL vs listen port  
4. Type on BWC sync after SIP change  
5. Firewall checklist walkthrough (screenshot placeholders)  
6. Internal bridge note for support engineers (short, not operator-facing)

**Ports disc:** `MOB-DISC-MANUALS-V1-PORTS-CONFIGURABLE-VS-DEFAULTS.md` — defaults ≠ fixed; Settings change + restart + Type on BWC must be in Tech Reference.

---

## Record

| Item | Result |
|------|--------|
| Operator question | Ports already changeable — why fix now? Need explanation in manuals |
| Confirm | **Yes — SIP port + operator URL + network in Settings; dashboard listen via env** |
| Agent error | Manual replan listed defaults without “customer can change” story |
| Fix | Manual content only — **Ports & network doors** chapter in Tech Reference |
| Not changing | Product port behaviour (already built) |
