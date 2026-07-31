# MOB DISC — Technical Manual V2: professional IT reference (locked plan)

**Date:** 2026-07-28  
**Status:** **PASS 2026-07-29** — Technical Manual v2.0 + Ch.18 (v2.1) operator PASS; writing standards also locked in `MOB-DISC-MANUALS-V1-WRITING-STANDARDS-LOCKED.md`  
**APPLY:** `MANUALS-V1-TECH-REFERENCE-V2` (+ Docker chapter APPLY)  
**Search:** Technical Manual, Server Config 6-phase, ports, firewall, Type on BWC, professional IT reference, Milestone style  
**File to rewrite (after APPLY):** `Mobility Axiom Manuals V1/Tech/EN/Technical Manual.rtf`  
**Brand:** **Ubitron Mobility Axiom** only (never C2 / ME8 in customer body)  
**Audience:** Customer IT / platform administrators / integrators — **not** daily operators, **not** Ubitron docs staff, **not** Cursor agent

---

## Plain answer

**Understood.**

1. The Installation Guide is **PASS**. Next book is the **Technical Manual** — the long, detailed IT reference.  
2. Current `Tech/EN/Technical Manual.rtf` is **stale**. It does not match live **Settings → Server Config** (six named phases), accurate ports behaviour, or Jul 26–28 product truth.  
3. Same writing rules as the Installation Guide: **no mumbling**, **no internal nicknames as cold dumps**, **no Word-first / staff workshop text**, **no trial/lab diary**.  
4. Method = **professional vendor administrator manual** (Milestone / Genetec pattern): overview → configuration by control surface → procedures with Purpose / Before you start / Steps / Expected result / Notes / Common problems → operations → recovery → acceptance.  
5. Content = **system truth from this product**, written in plain professional English. Length and detail are required. Shortcut chapters are not acceptable for this book.

**No Technical Manual file edits until you order APPLY.**

---

## Why this manual must be long and detailed

| Book | Job | Length expectation |
|------|-----|-------------------|
| **Installation Guide** | First boot → licensed → first admin → handoff | Full but finite path |
| **Technical Manual** | Day-2+ configure, operate, harden, recover | **Long reference** — every Server Config phase, ports doors, BWC, evidence, optional SKUs, service ops, faults |

Industry pattern (Milestone XProtect Administrator Manual and peers):

1. System overview and concepts  
2. Installation pointed to install guide (do not duplicate)  
3. **Configuration** as the bulk — each major UI area with step procedures  
4. Devices / hardware registration  
5. Users and security  
6. Storage  
7. Network / ports / encryption edge  
8. Maintenance, logs, troubleshooting  
9. Checklists  

Mobility Axiom follows that shape. We do **not** invent a short “tips” pamphlet and call it Technical Manual.

---

## Target reader (one sentence)

A site IT administrator who already finished the on-prem Installation Guide (or equivalent Ubitron provision), can open the dashboard as super admin, and must configure networking, cameras, firewall, evidence, users, and recover from start-up faults without guessing.

**Delete test:** If a sentence only helps the person writing the Word file, or only helps Ubitron internal ship desk — **it does not belong**.

---

## Relationship to other manuals (locked)

| Manual | Owns |
|--------|------|
| **Installation Guide (On-Premises)** — PASS | Service install, Setup PIN, license file install, LAN/WAN mode, first password change, handoff |
| **This Technical Manual** | Everything after: Server Config six phases, ports doors, BWC Type-on-device, firewall checklist, evidence/FTP, users/roles (IT depth), optional licensed modules, service restart rules, logs, recovery, go-live acceptance |
| **User / Quick Start** | Daily operator use — cross-reference only |
| **Managed Cloud / Hybrid guides** | Separate install stories — one paragraph pointer here, not full cloud DIY |
| **`docs/IT-ADMIN-MANUAL.md`** | Internal seed only — **migrate useful recovery into this Manuals V1 Tech book**; do not tell customers to open `docs/` |

**Do not** re-teach the full Windows/Linux service installer in Technical Manual. Point to Installation Guide.  
**Do** teach restart, logs, and “change SIP → restart → update cameras → update firewall” in full.

---

## Current Technical Manual — FAIL reasons (honest)

Existing `Technical Manual.rtf` fails professional bar because:

1. **Server Config is vague** — “network section” language instead of live phase names: **Identity**, **Networking**, **Access & Security**, **Storage & Devices**, **Resiliency**, **Diagnostics**.  
2. **Ports are incomplete / static** — does not teach three doors (Operator portal URL vs device SIP IP:port vs install-time listen ports) or Settings-change + restart + Type on BWC.  
3. **Install story conflicts** with Installation Guide PASS (desktop / script framing).  
4. **Glass Fortress** appears as cold jargon without plain customer definition.  
5. **Word-first** appears in Document Control (staff meta).  
6. Missing: dynamic firewall checklist walkthrough, Type on BWC procedure, reverse-proxy / Operator URL, entitlement padlocks for optional SKUs, accurate SIP listen story for cameras.

**Verdict:** Full rewrite to **Technical Manual Version 2** after APPLY — not a patch of a few paragraphs.

---

## Product truth the agent must write from (sources)

| Topic | Truth source (agent reads; customer never sees path names) |
|-------|--------------------------------------------------------------|
| Six phases + labels | `public/locales/en.json` (`server.phase.*`), `public/index.html`, `public/js/server-setup.js` |
| Restart after network/SIP | `server.restartNote` in `en.json` |
| Ports configurable vs env | `docs/MOB-DISC-MANUALS-V1-PORTS-CONFIGURABLE-VS-DEFAULTS.md`, `lib/serverSettings.js` `firewallChecklist` |
| Setup vs production | `lib/setupOnlyServer.js`, Installation Guide PASS |
| Never 172.17–172.31 | `docs/MOB-DISC-NO-WSL-172-AS-SERVER-IP.md` |
| Clock fault | `lib/timeAnchor.js`, IT-ADMIN seed § hardware clock |
| License HWID file | Setup + license manager; Installation Guide Ch.5 |
| First sign-in | `MOB-DISC-MANUALS-V1-FIRST-LOGIN-PASSWORD-GATE.md` (PASS) — short IMPORTANT + cross-ref |
| SIP path for cameras | Device registration IPv4 + SIP port in Settings; bridge behaviour in support-depth chapter only, plain words |
| Evidence | Evidence → Storage UI; Server Config Storage phase deep-link |
| Entitlements | License features / padlock UI — PTT, VC, analytics, CAD when licensed |

**Forbidden in customer body:** C2, ME8, NSSM, 1-Pack, MOB-APPLY, Cursor, “Word-first”, PHOTO SPACE workshop, trial bat story, license CRM on 3917, private keys, inventing ports not in product.

---

## Voice and method rules (same as Installation — stricter for Tech)

### Every major procedure must include

1. **Purpose** — why IT does this  
2. **Before you start** — rights, service state, what to have ready  
3. **Steps** — one action per numbered step; exact UI names  
4. **Expected result** — what success looks like  
5. **Notes** — side effects (restart, firewall, cameras)  
6. **Common problems** — short, plain  
7. **Screenshot placeholder** — one line only, e.g. `[Insert screenshot: Server Config Networking phase]`

### Callouts allowed

- **Important** — can break the site if ignored  
- **Warning** — security or data risk  
- **Note** — clarification  

### Fault messages (customer language)

When the service log shows a structured block with three lines (what happened / why / how to fix):

> Follow the **How to fix** line first.

Optional one sentence later in recovery chapter:

> Ubitron documents this structured start-up fault format for support. Technical support may ask you for that log block.

Do **not** open the manual with internal code names. Do **not** dump Glass Fortress as unexplained brand.

### Screenshots

Placeholders only until wording PASS. No staff paste instructions in the customer book.

---

## Locked chapter outline — Technical Manual V2

**Title:** Ubitron Mobility Axiom — Technical Manual  
**Subtitle:** On-Premises configuration and operations (IT reference)  
**Version target:** 2.0  

### Part A — Orientation

**1. About this manual**  
Audience, how to use (procedures + reference), related manuals, out of scope (operator daily use; Managed Cloud/Hybrid install; Migration).

**2. System architecture**  
One clear picture in words + diagram placeholder: Mobility Axiom **server service** · operator **browsers** · **body-worn cameras** (register to server IP + SIP port) · **evidence storage** · optional reverse proxy · optional licensed modules.  
Explain: operators never start a desktop console for daily work.

**3. Roles and access**  
Super administrator vs operator; who may change Server Config; read-only behaviour for non–super-admin; password vault for `global` and IT PIN if used.

**4. Setup Mode versus production dashboard**  
When Setup appears; localhost Setup only; PIN from service log; Operator portal URL for daily access; never publish Setup to the public internet. Point to Installation Guide for first license install.

**5. Licensing for IT (day-2)**  
Hardware ID lock; request file from Ubitron; install on Setup; do not edit file; entitlements appear as available or locked features; what to send support when license rejects. No internal license CRM.

### Part B — Server Config (bulk of the book — must be deep)

**6. Server Config overview**  
Path: Settings → Server Config. Top-level areas: Network & deployment (six phases), BWCs, Map groups, Dashboard Authentication, related Maintenance/Diagnostics as applicable. Save model. **Mandatory restart rule** after network or SIP changes.

**7. Phase 1 — Identity**  
Deployment mode meaning for an on-prem site; tenant/customer name; what not to pick when this site is pure on-prem (point Managed Cloud / Hybrid manuals).

**8. Phase 2 — Networking**  
LAN/WAN fields; **device registration IPv4** (the address cameras type); SIP listen address; hostname/DNS as used; **never 172.17–172.31**; verify preferred real adapter IP; expected result and common mistakes.

**9. Phase 3 — Access & Security**  
**Operator portal URL** (what staff bookmark); Trust reverse proxy; SSL certificate upload on-prem when used; **dashboard listen port read-only** — how IT changes it via package/README + service restart (no pretend Settings toggle); difference between portal URL and listen port.

**10. Phase 4 — Storage & Devices (protocol)**  
SIP port, platform/realm/passwords, media transport; ONVIF fields when used; **Type on BWC** checklist — how to use it; site timezone; link out to Evidence storage chapter; full **change SIP port** procedure (Save → restart service → update firewall → update every camera → verify Online).

**11. Phase 5 — Resiliency**  
Single-node default; peer URL / node ID when the site uses it; honest limits (do not invent multi-site magic).

**12. Phase 6 — Diagnostics**  
Site configuration status; site readiness checklist; how to use before go-live and after changes; what “green” means vs “still open work”.

### Part C — Devices, users, storage, network doors

**13. Body-worn cameras and map groups**  
Register Device ID and officer; groups; Online verification; password/IP/port mismatch symptoms; map group purpose for ops (IT depth only).

**14. Dashboard Authentication (IT)**  
Create users and roles; site security settings; IT/diagnostics PIN if present in UI; first-login IMPORTANT short block + pointer to Installation / User manuals.

**15. Ports and network doors (reference chapter)**  
Must teach clearly:

| Door | Meaning | Where set |
|------|---------|-----------|
| **A. Operator portal URL** | What browsers bookmark | Settings → Access & Security |
| **B. Device registration** | IPv4 + SIP port cameras use | Networking + Storage & Devices (SIP) |
| **C. Dashboard listen ports** | What the service binds | Package / install environment; often read-only in Settings |

Defaults table (typical — always “confirm in README and live Settings”):

| Service | Typical default | Notes |
|---------|-----------------|-------|
| Setup (server only) | 13988 | Localhost; not for operators |
| Dashboard HTTP | 3988 | Package may differ |
| Dashboard HTTPS | Package-specific (often documented with HTTP) | Edge / TLS |
| SIP (cameras) | Shown in Settings (commonly 5060 on new sites) | Changeable in Settings |
| Message / video / audio / PTT / FTP / VC | From live **firewall checklist** | Enable with license/features |

**After any SIP or network save:** restart Mobility Axiom service → update firewall → update Type on BWC on each device.

**16. Firewall planning**  
How to read the **inbound services / firewall readiness checklist** in Settings; LAN-Only vs WAN Public Edge differences; do not publish Setup; upstream firewall owners; example planning worksheet (blank fields, not fake IPs).

**17. Evidence storage and FTP**  
Evidence → Storage: local disk vs NAS mount first; paths; FTP enablement for docks/cameras when used; catalog vs media files; backup note (site policy); common permission faults.

**18. Optional licensed modules**  
Only what the product exposes under entitlement: e.g. PTT, Video Conference, analytics, CAD — **available when licensed**, padlock when not. Ports and Docker/edge notes only where true. No selling language.

### Part D — Operations and recovery

**19. Service operations**  
Windows Services / Linux systemd: start, stop, restart, Automatic start; when restart is mandatory; who may restart; health after restart.

**20. Logs and what to capture for support**  
Where service logs live (README paths); what excerpt to send; Hardware ID; package version; remove secrets per policy.

**21. Start-up and runtime recovery**  
Cannot open Setup; no PIN; port already in use; hardware clock / date-time; license rejected; structured how-to-fix log blocks; service will not stay running.

**22. Camera and SIP path check (advanced IT)**  
Registration reachability; confirm device points at same IPv4 and SIP port as Settings; after change checklist; when to escalate to Ubitron (plain language — no wrong-port homework from obsolete docs).

**23. Go-live acceptance checklist**  
Service auto-start; license valid; admin password changed; Operator portal opens from control room; one BWC Online; one live view; evidence path writable; firewall matches checklist; Setup not exposed; runbook updated.

**24. Troubleshooting index**  
Portal unreachable; device offline; live video fails; license; clock; conference/PTT if licensed; password; reverse proxy.

**25. Document control**  
Product, manual title, audience, language, version 2.0, related manuals. **No** Word-first meta.

---

## Depth standard (non-negotiable for APPLY)

For phases 7–12 and chapters 13–17, the written RTF must be **procedure-grade**, not summary bullets:

- Exact menu path and control names from live UI  
- What each important field is **for** (one plain sentence)  
- What happens if wrong (especially device IP and SIP port)  
- Restart / firewall / camera follow-through  
- Expected result and 2–4 common problems  

If a chapter feels “shortcut,” it fails review before operator PASS.

---

## APPLY plan (one MOB — after this disc PASS)

**Name:** `MANUALS-V1-TECH-REFERENCE-V2`

**Action:** Fully replace `Mobility Axiom Manuals V1/Tech/EN/Technical Manual.rtf` with Version 2.0 following **this disc only**.

**In scope:** All chapters 1–25 above (customer voice).  
**Out of scope:** Product code changes; Managed Cloud/Hybrid full guides; screenshot photography; User/Quick Start rewrite; Installation Guide edits.

**Operator PASS test after APPLY:**

1. Open Technical Manual in Word.  
2. Confirm six Server Config phases use **exact product names**.  
3. Confirm ports chapter teaches three doors + restart + Type on BWC.  
4. Confirm zero C2 / ME8 / Word-first / trial bat / unexplained Glass Fortress dump.  
5. Confirm it feels like a real IT administrator manual (long, clear methods) — not a short tip sheet.  
6. Say **PASS** or list section numbers that fail.

---

## Agent must NOT

- Patch the stale RTF with one “6-phase” paragraph and call it done  
- Copy `docs/IT-ADMIN-MANUAL.md` raw into customer Word (ME8 paths, internal tone)  
- Re-duplicate Installation Guide service install as the bulk of Tech  
- Invent CPU/RAM matrices not on the Ubitron sizing sheet  
- Document SIP on obsolete wrong ports  
- Bundle Cloud + Hybrid + User sync into this MOB  
- Mumble to self (“for staff”, “example when flag”, “PHOTO SPACE”)

---

## Related discs

| Disc | Role |
|------|------|
| `MOB-DISC-MANUALS-V1-PROFESSIONAL-REPLAN-V1.md` | Family split; Tech owns 6-phase + ports |
| `MOB-DISC-MANUALS-V1-GENRE-QUEUE-NEXT.md` | Installation PASS; Tech next |
| `MOB-DISC-MANUALS-V1-INSTALL-ONPREM-CUSTOMER-VOICE-LOCKED.md` | Voice / brand / OS rules |
| `MOB-DISC-MANUALS-V1-PORTS-CONFIGURABLE-VS-DEFAULTS.md` | Ports truth |
| `MOB-DISC-MANUALS-V1-FIRST-LOGIN-PASSWORD-GATE.md` | First sign-in PASS |
| `MOB-DISC-MANUALS-V1-INSTALL-LICENSE-PATH-IN-CUSTOMER-GUIDE.md` | No casual disk-path teaching |
| This disc | **Technical Manual V2 locked plan** |

---

## Lock record

| Item | Decision |
|------|----------|
| Next manuals book | Technical Manual V2 |
| Style | Milestone/Genetec-style IT administrator reference — long, procedural |
| Core content | Live 6-phase Server Config + ports doors + BWC + firewall + evidence + recovery |
| Voice | Customer IT only; Mobility Axiom brand |
| File edits now | **None** until go ahead / `MOB-APPLY MANUALS-V1-TECH-REFERENCE-V2` |
| Operator | Read this disc → approve or correct outline → then APPLY |
