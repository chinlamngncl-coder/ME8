# MOB DISC — Installation Guide: professional new-client standard (locked)

**Date:** 2026-07-28  
**Status:** **PASS 2026-07-28** — Installation Guide v1.1 live in `Installation/EN/Installation Guide.rtf`  
**Operator:** PASS on professional rewrite + license-path removal  
**APPLYs locked:** `MANUALS-V1-INSTALL-ONPREM-CUSTOMER-VOICE-V1`, `MANUALS-V1-INSTALL-DROP-LICENSE-PATH-V1`, professional expansion (go ahead 2026-07-28)  
**Search:** installation manual professional, new client, Windows Server, Ubuntu, RHEL, permitted, Milestone style, customer voice  
**Product brand:** **Ubitron Mobility Axiom** (never C2 in customer text)  
**Audience of the guide:** **new customer IT** only  

---

## Plain answer

**Understood.**

1. The Installation Guide is for **new clients** installing **Ubitron Mobility Axiom** for the first time.  
2. **No** lab. **No** trial. **No** old folder. **No** “prior console.” **No** agent diary.  
3. Voice = **customer IT** — like Milestone / Genetec install guides: prepare → install → license → verify → handoff.  
4. OS = **Windows Server** and **named Linux** distributions that fit our stack (filled from system suitability below).  
5. Content = what the system **allows**, **first steps**, and **must not do** — not internal nicknames.

Previous ENTERPRISE-REWRITE = **REJECTED**. Do not reuse its voice.

---

## Target reader (one sentence)

A site IT administrator who has never seen Mobility Axiom before, received a Ubitron delivery package, and must put a **server** into production.

If a sentence only helps Ubitron staff or the Cursor agent — **it does not belong in this guide**.

---

## Brand (locked)

| Say | Never say in customer manuals |
|-----|-------------------------------|
| **Ubitron Mobility Axiom** or **Mobility Axiom** | Mobility C2, Ubitron C2, ME8 (except hidden Document Control if needed) |
| Company: **Ubitron** | OEM / banned vendor names |

Service display name in the guide: **Mobility Axiom** (or “Mobility Axiom server service”).  
Internal Windows service ID may still be technical — customer text does not teach **C2**.

---

## Supported platforms (from our system — fill Linux properly)

### What the product actually runs on

| Fact | Source |
|------|--------|
| Windows service install path | `Install-UbitronC2-Service.ps1` / NSSM — production with 1-Pack entry |
| Linux service unit | `scripts/me8-ship/me8-server.service` — systemd, `/opt/me8`, user `me8` |
| Runtime generation | Ship pack / Node **22** (Dockerfile `node:22-bookworm-slim`; protected ship) |
| Field bug template examples | Windows Server 2022 / **Ubuntu 22.04** |
| Container base (alignment) | Debian **Bookworm** |

### Locked V1 platform list for the Installation Guide

**Windows (primary for most customers)**

- **Windows Server 2019** or **Windows Server 2022** (64-bit)  
- Administrator rights for service install and firewall  
- Static IPv4 or DHCP reservation  

**Linux (x86_64, systemd)**

Document these as supported for V1 host install (aligned with our stack and common enterprise practice):

| Distribution | Notes |
|--------------|--------|
| **Ubuntu Server 22.04 LTS** | Named in our own bug template; systemd |
| **Ubuntu Server 24.04 LTS** | Same family; acceptable if pack README matches |
| **Rocky Linux 9** or **AlmaLinux 9** or **RHEL 9** | Enterprise systemd; choose one wording: “RHEL 9 or compatible (Rocky / Alma 9)” |
| **Debian 12 (Bookworm)** | Aligns with our Node 22 Bookworm container base |

**Not in V1 Installation Guide as supported** (unless Ubitron cover letter says otherwise):

- Desktop-only Windows 10/11 as the **recommended** production server (may appear only as “not recommended for production”)  
- Non-systemd Linux  
- ARM boards as primary server  
- “Any Linux” without naming the list above  

**Honest note for agent (not customer prose):** Linux unit exists; full automated Linux installer script is thinner than Windows. Customer guide still documents systemd install steps; pack README may supply exact file names per order.

---

## How professional vendors structure install manuals (adapt for us)

Pattern from **Milestone XProtect** (and peers like Genetec):

1. **Getting started checklist** — prepare OS, network, time, antivirus exclusions, license readiness  
2. **System requirements** — named OS versions  
3. **Install the server** — one clear path  
4. **Activate / license** — customer obtains entitlement from vendor  
5. **First configuration** — minimum to go live  
6. **Verify** — checklist  
7. **Next steps** — point to configuration / user guides  
8. **Troubleshooting** — short, plain  

**Ubitron Mobility Axiom on-prem Installation Guide must follow that shape** — not a lab restart diary.

---

## Locked chapter outline (customer voice only)

**Title:** Ubitron Mobility Axiom — Installation Guide (On-Premises)

1. **About this guide** — who it is for; related manuals by name only (Technical / User / Quick Start). No “Word-first.”  
2. **Before you begin (checklist)** — OS from list above; admin rights; static IP; correct date/time; delivery package; Ubitron contact for license; cameras later.  
3. **Install the server software**  
   - 3.1 Windows Server  
   - 3.2 Linux (Ubuntu / RHEL-compatible / Debian as above)  
4. **Complete Setup on the server** — open Setup on the server computer; enter PIN from the service log; copy Hardware ID.  
5. **Request and install your license** — send Hardware ID + site/contract to **Ubitron** → receive **license file** → upload on Setup.  
6. **Select site network mode** — LAN only or public edge (WAN). Cloud / hybrid = other guides (one sentence).  
7. **First administrator sign-in** — one-time factory account; must change password; factory password cannot be kept.  
8. **Minimum settings before handoff** — Operator portal URL; confirm real LAN IP for devices; note that SIP port and related values can be changed in Settings (details in Technical Manual).  
9. **Installation verification checklist**  
10. **What to give operators** — portal URL + User / Quick Start  
11. **Important rules (do / do not)**  
12. **If something goes wrong** — plain language only  
13. **Document control** — short footer  

**Screenshot placeholders:** one short line under each major step, e.g.  
`[Insert screenshot: Setup page showing Hardware ID]`  
No staff paste workshop. No “PHOTO SPACE height 8 cm.” Capture instructions live only in Format Standard (internal).

---

## What is permitted / first / not permitted (system truth → customer language)

### First steps (order locked)

1. Prepare server OS and network (static IP, correct clock).  
2. Install Mobility Axiom as a **service** (Windows or Linux).  
3. Open **Setup on the server** (default address on the server itself: `http://127.0.0.1:13988`).  
4. Enter Setup PIN from the **service log**.  
5. Copy **Hardware ID** → send to **Ubitron** with contract/site name.  
6. Upload the **license file** Ubitron returns.  
7. Save network mode (LAN or WAN edge).  
8. Restart service if required → open dashboard → **change factory password**.  
9. Set Operator portal URL for staff.  
10. Hand portal URL to operators; IT continues device/network detail in **Technical Manual**.

### Permitted (IT may do)

- Install on supported Windows Server or listed Linux.  
- Run as a background service (auto-start).  
- Use Setup on **localhost on the server** (or secure remote desktop / SSH tunnel to localhost).  
- Request license from Ubitron using Hardware ID.  
- Choose LAN-Only or WAN (Public Edge) for on-premises.  
- Change SIP port, device server IP, Operator portal URL, and related Settings after login (super admin).  
- Change dashboard listen ports at install time per pack instructions, then restart the service.  
- Point body-worn cameras at the server’s **real** LAN IPv4 and the SIP port shown in Settings.

### Not permitted / must not (customer language)

- Do **not** use Docker or WSL virtual addresses (**172.17–172.31**) as the camera server IP or operator bookmark.  
- Do **not** edit the license file by hand.  
- Do **not** keep the factory password after first sign-in.  
- Do **not** expose the Setup page to the public internet (Setup is for the server only).  
- Do **not** expect operators to start the product from a desktop console every day — they use the **portal URL**.  
- Do **not** install as “pick Cloud” from this on-premises guide — that is a different Ubitron offering.  
- Do **not** generate licenses on the customer server (signing stays with Ubitron).

### Take note (short warnings)

- After network or SIP changes in Settings: **restart the service**, update firewall, update each camera.  
- Clock wrong (stuck in the past) can block normal start — set BIOS/OS time first.  
- If a port is already in use, free it before restart (plain “port already in use” — no internal project names).  
- If the log shows a three-line fault (what happened / why / how to fix), follow **how to fix**. (Technical Manual may name this format once; Installation Guide uses plain words.)

---

## Forbidden words and habits in this guide

| Forbidden | Use instead |
|-----------|-------------|
| C2, ME8 (body) | Mobility Axiom |
| Glass Fortress (cold dump) | “fault block in the log” / “how to fix” |
| Word-first, PHOTO SPACE workshop, “for staff” | `[Insert screenshot: …]` only |
| trial, lab, old console, migrate from Test pack | omit entirely (Migration Guide later) |
| bundled Node headline | “runtime is included in the delivery package” once if needed |
| mumbling / “example when flag provided” | one clear path per OS |
| 1-Pack, NSSM, MOB-APPLY | omit from customer body |

---

## Relationship to other manuals

| Manual | Role |
|--------|------|
| **This Installation Guide** | New on-prem server → licensed → first admin → handoff |
| **Technical Manual** | Ports matrix, six Server Config phases, cameras, firewall, recovery detail |
| **User / Quick Start** | Operators after handoff |
| **Managed Cloud / Hybrid** | Separate — not chapters stuffed into on-prem |
| **Migration** | Existing sites / upgrades only |

---

## Next APPLY (when operator says so)

**Name:** `MANUALS-V1-INSTALL-ONPREM-CUSTOMER-VOICE-V1`

**Action:** Fully replace Installation Guide text (overwrite rejected drafts). Follow **this disc only**. Short. Cold. Professional. New clients only.

**Before APPLY:** no more “research drafts” that reintroduce lab. Outline above is approved by this disc unless operator edits OS list.

---

## Agent must understand (checklist)

- [x] Reader = new customer IT  
- [x] Brand = Ubitron Mobility Axiom  
- [x] OS = Windows Server 2019/2022 + named Linux list  
- [x] Structure = vendor-style install guide  
- [x] Content = permitted / first steps / not permitted  
- [x] Zero lab/trial/old-path storytelling  
- [x] Zero internal mumbling  
- [x] Screenshots = simple placeholders only  

---

## Record

| Item | Result |
|------|--------|
| Operator | Professional new-client install; Windows + Linux filled; copy vendor style; no lab |
| Agent | Understood — locked in this disc |
| Rejected | ENTERPRISE-REWRITE and bat-first drafts |
| Next | `MOB-APPLY MANUALS-V1-INSTALL-ONPREM-CUSTOMER-VOICE-V1` when ordered |
