# MOB DISC — Lab is NOT confused: license / SIP / GB / 172 (agent fault)

**Date:** 2026-07-31  
**Status:** LOCKED — agent correction  
**Audience:** Operator on **this PC** (ME8 lab `192.168.1.38`)  
**Trigger:** Operator: after CN pack recon, agent dumped “pick license.lic / dual SIP / not 440102 / never 172” as if **we** were still confused. That was wrong.

---

## Plain answer

**Your lab is not confused. The agent mixed two jobs.**

| Job | What it was | Who it was for |
|-----|-------------|----------------|
| **A — Your daily ME8 lab (this PC)** | Already configured and running | **You** |
| **B — Future Chinese partner zip design** | Architect notes only | Lead / Google / later pack |

In the pack-recon reply, agent pasted **Job B** bullets as if they were **Job A** open questions. That sounded like the IDE was living outside your PC. **Fault = agent wording, not your setup.**

**ANPR Live FAIL** (empty rail / plate-only) is a **separate** genre. It has nothing to do with license.lic vs platform-license, SIP 5060/5062, or 172.

---

## What is true **on this PC right now** (recon 2026-07-31)

Read from your `.env`, `storage/`, and listening ports — not from a fantasy pack.

### 1) License — lab uses platform file; air-gap `.lic` is off

| Fact | Value |
|------|--------|
| `storage/license.lic` | **MISSING** |
| `storage/platform-license.json` | **EXISTS** (`customer=Core Only`, `maxBwc=8`) |
| Air-gap required | **Not** forcing `.lic` on this lab (no `.lic` file; lab fail-open for air-gap) |

**So today:** you are **not** choosing between two stories every morning. Lab = **`platform-license.json`**.  

**“Pick `license.lic` as primary”** was only a **future customer-pack** design note (so a CN zip does not ship two unclear license files). **It does not mean change your lab tonight.** It does not mean Setup/air-gap is broken on your desk.

### 2) SIP 5060 and 5062 — both listening = **by design**, not confusion

| Port | Role on **this** PC | Evidence |
|------|---------------------|----------|
| **5060** | WVP / GB **video** register path (`FM_WVP_SIP_PORT`, proxy listen) | Listening (proxy + stack) |
| **5061** | Docker WVP SIP published | Listening |
| **5062** | **Fleet** SIP (YDT / telemetry / MESSAGE GPS / DeviceControl) — `FM_GB28181_SIP_PORT=5062`, `server-settings sipPort: 5062` | Listening on Fleet PID |

Your `.env` already documents the split (`FM_WVP_VIDEO_HANDOFF=1`, Fleet on 5062).  

**Not a bug. Not “we still don’t know which SIP.”** Two listeners, two jobs. Operator does not pick one every day.

### 3) GB platform IDs — **your** Fleet IDs are already set; `440102…` is WVP compose lab default

| Layer | On this PC |
|-------|------------|
| Fleet `.env` | `FM_GB28181_PLATFORM_ID=34020000002000000001`, `FM_GB28181_REALM=3402000000` |
| WVP compose defaults (image/docs) | Often still show example `4401020049` / `44010200492000000001` |

**“GB IDs must be partner’s, not 440102”** = instruction for **someone else’s China install later**, when they edit WVP compose / partner `.env`.  

**Not** “your lab still has wrong 440102 and we don’t know.” Your Fleet side already has **340200…**. Do not rewrite lab GB IDs because of a pack-recon sentence.

### 4) Never 172.17–172.31 — **already locked**; your HOST is correct

| Fact | Value |
|------|--------|
| Rule | Locked disc `MOB-DISC-NO-WSL-172-AS-SERVER-IP.md` |
| This PC `HOST` / public / WVP stream host | **`192.168.1.38`** |

That bullet in the pack reply was a **remind-the-architect** line for a future zip (so they don’t ship WSL IPs). **You are not “still deciding” LAN IP.** Lab is already on Wi‑Fi `192.168.1.38`.

---

## What agent must never do again

1. Dump **future pack design** as if **operator lab** is undecided.  
2. Open ANPR / Live / FR chats with license / SIP / 172 / GB partner bullets.  
3. Say “we are still confused” about things this `.env` already locks.  
4. Imply the IDE is designing a remote partner machine while ignoring **this** PC’s files.

**When ship/pack for China:** then print pack gather + those architect constraints **once**, clearly labeled **partner pack**, not lab.

---

## What you should care about **this stage** (ANPR)

| Genre | Status |
|-------|--------|
| ANPR Live empty / plate-only no vehicle | **FAIL** — disc `MOB-DISC-ANPR-LIVE-VEHICLE-SCENE-PLATE-FAIL-20260731.md` |
| Next APPLY when you say so | `ANPR-LIVE-VEHICLE-SCENE-PLATE-V1` |
| License / SIP / 172 / GB on this PC | **Not** the open problem |

---

## Lock

**Lab = clear.**  
**Pack-recon extras ≠ open lab questions.**  
**Agent apologizes for the mix-up.** No code. No APPLY in this disc.
