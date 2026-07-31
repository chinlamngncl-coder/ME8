# MOB DISC — Commercial pack = NEW install (stop lab port / IP religion)

**Date:** 2026-07-31  
**Status:** LOCKED principle — **no code in this disc**  
**Audience:** Operator (commercial Mobility Axiom) + agents  
**Tone:** Operator is right. Months of the same SIP / port / IP loop is a **product failure**, not “architecture depth.”

---

## Plain English

This is going to be **commercial software**.

A customer (or China partner) must open a **new** pack, run Install / Setup **once**, enter **their** server address and license, and run.  

They must **not**:
- inherit Ubitron lab `192.168.1.38`
- inherit lab dual-SIP lectures (5060 vs 5062 as a daily argument)
- inherit Guangdong `440102…` GB toys
- inherit agent chats that re-open ports / IP every week
- get a zip that is a **clone of the lab `.env`**

**Pack everything as new.**  
**Do not control ports / IPs as hard product truth.**  
**Customer (or Setup wizard) owns HOST and ports once. Agent stops owning them in chat.**

---

## What went wrong (months)

| Habit | Harm |
|-------|------|
| Lab IP baked as code fallback (`192.168.1.38` in WVP client / compose / scripts) | Every new machine “mysteriously” points at your desk |
| Dual SIP explained as open confusion | Customer face feels unfinished; chats never leave 5060/5062 |
| Pack recipes that copy lab culture | PH/KR / trial disasters; zero trust |
| Agent dumps port tables into ANPR / Live / FR chats | Operator hears “still confused” while trying to ship features |
| Treating `.env` archaeology as product design | Commercial software never ships as “ask Google which SIP” |

**Locked:** That loop ends as **policy** here. Code cleanup is a **later named APPLY** — not another essay in every MOB.

---

## Commercial rules (LOCK)

### 1) Pack = new tree

- Build from **protected ship / 1-pack + clean templates** (`build:ship`, commercial packer).  
- **Never** zip the live lab folder, live `storage/` secrets, or lab `.env` as the customer product.  
- Fresh `storage/`, fresh Setup, signed **`license.lic` for that machine’s HWID**.  
- One license story for commercial: **`license.lic`**. Lab may keep `platform-license.json` for desk work — **customer zip does not teach two licenses**.

### 2) IP = detect or enter once — never hardcode lab

| Allowed | Forbidden in commercial defaults |
|---------|----------------------------------|
| Auto-detect real LAN (skip WSL/`172.17–172.31`) | Fallback string `192.168.1.38` in ship code / compose / Start |
| Setup / Settings field: “Server address” | Agent telling customer “use 5062 because lab…” |
| `127.0.0.1` only for same-PC browser | Docker/WSL 172 as public HOST |

**Never 172** stays locked (`MOB-DISC-NO-WSL-172-AS-SERVER-IP.md`) — as **auto-detect skip**, not as a monthly lecture.

### 3) Ports = defaults + customer change — agent does not “control” them

Commercial pack ships **sensible defaults** (one dashboard port, one BWC register story on the install sheet).  

Under the hood the engine may still use more listeners. **Customer docs and Setup show one register host:port.** Internal split is not a customer debate and not an every-chat agent topic.

| Agent MUST | Agent MUST NOT |
|------------|----------------|
| Fix product bugs (ANPR, video, FR) without opening port theology | Re-litigate 5060 vs 5062 / 3888 vs 3988 in feature chats |
| When packing: use pack gather + Setup | Hardcode partner ports in source “for safety” |
| If install fails: read **their** Settings / `.env` on **their** machine | Paste lab port tables as if the product is undecided |

### 4) GB / WVP IDs = customer commission fields

Commercial defaults: **empty or placeholder “set at install”** — not `440102…`, not Ubitron lab realm.  
Partner fills **their** platform ID / domain at Setup or first-run config. Softwares does not ship your lab identity as product.

### 5) Map / language = pack profile, not hardcode in engine forever

CN pack profile: zh + offline tiles + map center for site (e.g. Jiangsu).  
That is **pack meta / Setup**, not months of “are we Singapore or Beijing” in core chats.

### 6) Ordinary MOB chats

**Forbidden openers / side plots:** SIP ports, dashboard ports, HOST IP, 172, dual license, GB ID archaeology — unless the user **named** that pack/install genre.

**Allowed:** the named feature (e.g. ANPR vehicle scene).

---

## Evidence (why this disc is not drama)

Hardcoded / lab-shaped defaults still exist in tree (examples):

- `lib/wvpLabClient.js` — fallback `192.168.1.38`  
- `docker/wvp/wvp-config/application-modern.yml` — `192.168.1.38` + `440102…`  
- Lab Start / restart scripts — lab IP fallbacks  
- Agent pack-recon text — re-taught ports/IP as if open questions  

Lab `.env` on your PC can stay messy for **desk**. **Commercial pack must not.**

---

## What “nicely pack everything as new” means (one path)

When you order a commercial pack APPLY (name TBD, e.g. `COMMERCIAL-PACK-CLEAN-DEFAULTS-V1` / CN partner pack):

1. New folder from ship templates — not Desktop lab clone.  
2. Strip lab IP / lab GB / lab dual-license from **defaults**.  
3. Setup: detect LAN → confirm HOST → drop `license.lic` → start.  
4. One customer sheet: dashboard URL + **one** BWC SIP register line + FTP/PTT if needed.  
5. PRE-SHIP GATE + pack gather — then zip.  
6. Agent does not reopen port religion after PASS.

**Not in that pack MOB:** rewriting all of Fleet SIP architecture for sport. Goal = **clean defaults + Setup owns config**, not months more of port chat.

---

## This stage (your desk today)

| Item | Status |
|------|--------|
| Principle in this disc | **LOCKED** |
| Code / packer rewrite | **Not started** — needs named `MOB-APPLY` |
| Lab keep working | OK — lab `.env` is yours; commercial pack ≠ lab |
| ANPR Live FAIL | Separate: `MOB-DISC-ANPR-LIVE-VEHICLE-SCENE-PLATE-FAIL-20260731.md` |
| “Lab not confused” disc | Still true for **desk**; this disc locks **commercial** so agents stop projecting pack anxiety onto desk |

---

## Agent apology (locked)

Operator asked for commercial software. Agent answered with lab archaeology and port control. That wasted months of trust.  

**Next:** either feature APPLY you name, or commercial-pack APPLY you name.  
**Not:** another voluntary sermon on 5060 / 192.168 / license.lic in the wrong chat.

---

## Lock phrase

**Commercial Mobility Axiom packs as NEW. Customer owns IP and ports once via Setup. Lab hardcodes and port religion are forbidden in customer defaults and forbidden as agent side plots. No code until MOB-APPLY.**
