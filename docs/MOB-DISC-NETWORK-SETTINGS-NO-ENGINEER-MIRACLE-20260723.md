# MOB DISC — Network settings must be in Settings (no engineer miracle)

**Date:** 2026-07-23  
**Status:** PAPER — self-check + questions for second opinion  
**Related:** C4 `TRUST-PROXY-AND-HOST-V1`, `MOB-DISC-TRUST-PROXY-STANDBY-DEFAULT-OFF-20260723.md`

---

## Locked product rule (plain)

**We cannot ship “ask an engineer to edit `.env` / nginx by memory.”**  

If a customer (or their IT) needs a network / HTTPS / front-door choice, it must be findable in **Settings → Server Config** (or a clear linked panel), with short plain labels.  

Missing that = **trust killer**. C4 must not be a hidden code-only trick.

---

## Self-check — what we **already** have (good news)

Server Config network nav already includes:

| Section | Basic job |
|---------|-----------|
| Deployment | Lab / LAN / Cloud / Hybrid |
| LAN network | Server IP, subnet, gateway, DNS |
| WAN / internet | Public IP, DDNS, VPN notes |
| Operator portal | Bookmark URL staff open + TLS badge; dashboard port **shown** |
| **Reverse proxy** | **Trust reverse proxy** checkbox + Save (default **OFF**) |
| Device registration | IPv4 cameras type on SIP + SIP listen |
| Protocol | SIP / ONVIF ports |
| Site readiness | Checklist including HTTPS / reverse proxy |

So: **trust proxy is already a Settings control**, not invent-from-zero.  
LAN / operator URL / device IP are also there.

**C4 standby = harden + clarify + ship-proof what exists**, not invent a secret second system.

---

## Self-check — real gaps (possible killers if ignored)

| Gap | Risk | Who hits it |
|-----|------|-------------|
| **Fleet’s own HTTPS listen** (`FM_HTTPS_ENABLED` / `:4438` / certs) | Still mostly **`.env` / restart**, not a Server Config form | Lab now; customer if we don’t document OR don’t add UI |
| Dashboard **port** read-only | Change needs env/restart | IT who want only 443 |
| Trust-proxy wording is **engineer-ish** (“X-Forwarded-Proto”) | Non-IT leaves it wrong | Site admin |
| Operator URL helper may still suggest **`http://`** | Confusing after C1 HTTPS | Operators bookmark wrong door |
| LAN fields don’t change the Windows NIC | OK if copy says “match OS”; bad if user thinks Save = OS IP | Everyone |

**Logic:** C1–C3 made HTTPS **work** in lab. Ship trust still needs Settings + pack docs so **nobody** must phone us to flip a mystery switch.

---

## What C4 should mean (when APPLY)

Not “miracle backend only.” Prefer:

1. **Keep** Trust reverse proxy in Server Config (default OFF).  
2. **Plain English** copy: when to leave OFF (direct) vs ON (nginx/Caddy in front).  
3. **Readiness** must match reality (HTTPS portal + trust proxy rules).  
4. **Decide (see questions below):** whether “Enable Ops HTTPS on this server” belongs in Settings, or ship always says “IT front door on 443” + our `:4438` as lab/advanced.  
5. Never require a Ubitron engineer on site for the basic path.

---

## Questions for Google / second AI (please confirm)

Use these if you want an outside check:

1. For an on-prem BWC Ops product, is it acceptable that **Node listens HTTPS on a high port (e.g. 4438)** and Settings only stores the **operator URL + trust-proxy**, while **port 443 + company cert** stay on customer nginx — or must Settings also toggle “built-in HTTPS”?  
2. Should **trust proxy default OFF** with a readiness warning when operator URL is `https://` but trust proxy is off — and is that enough for SOC2-ish expectations?  
3. Is showing **dashboard listen port as read-only** (change via install/env) industry-normal for Node apps behind optional reverse proxy?  
4. What is the minimum Settings surface so a **non-developer site admin** can go live on a LAN without editing `.env`?  
5. Any killer if we ship C1–C3 lab HTTPS **without** a Settings toggle for `FM_HTTPS_*`, as long as install guide + Server Config operator URL are filled?

---

## Recommendation (this agent — single path)

- **Do not skip Settings.** C4 = polish existing **Reverse proxy + network + readiness**, default trust OFF.  
- **Treat missing HTTPS-in-Settings as an open product question** (questions above) — not “already done.”  
- Until that is answered: pack docs must say exactly how to open Ops HTTPS (direct `:4438` or front door).  
- No “engineer will fix it on the day” as the plan.

---

## One line

**Basics belong in Server Config (we already have LAN / URL / trust-proxy); C4 must harden that for ship, and we must not leave built-in HTTPS as a silent `.env`-only killer without a clear Settings or install path.**
