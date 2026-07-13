# MOB DISC — What to do next (plain list)

**Status:** OPEN for pick — one MOB at a time  
**Date:** 2026-07-12  
**Search:** next MOB, queue, low risk, what to do, plain English  
**Work tree:** ME8 lab only (Test 2 zip already decided — do not rebuild tonight unless you say so)

---

## How we work

1. Read the list.  
2. You say **yes** to one item (or pick another).  
3. I do **only that one**.  
4. You try it. Then next.

No stacking. No locked live-video / PTT files unless you name them.

---

## Already done (today) — skip these

| What | In plain English |
|------|------------------|
| Ship checklist | When you say “ship”, we print a short pack gate — not every day |
| Login factory hint | “First install / global123” only for brand-new installs — not for you |
| Port fight cause | Lab Windows service was fighting the Start button |
| Send zip | **`Mobility-Test-2-CLIENT.zip`** is the one for clients |
| Bell text | Says **Alerts** — not the dumb word Label |

---

## Candidate list (what it does — simple English)

Risk = chance of breaking live ops / login / cameras.

### A — Low risk (recommended order)

| # | Name | What it does (plain) | Risk |
|---|------|----------------------|------|
| **1** | **Start safe** | Before ME8 starts, check: is something already using the ports? Is the Windows service still on? If yes → **stop and tell you** instead of starting a half-dead server. Stops today’s merry-go-round. | **DONE** `mob-start-safe` |
| **2** | **Name on login** | Login screen still says old product nickname in places. Change visible name to **Ubitron** style only (no OEM names). Looks more professional. | **DONE** `mob-login-brand` |
| **3** | **Start note in README** | One short line for lab: “stop the Windows service before Start.” So you are not the only one who remembers. | **DONE** `mob-start-readme` |

### B — Medium (later this week, still safe if careful)

| # | Name | What it does (plain) | Risk |
|---|------|----------------------|------|
| **4** | **Missed Alerts polish** | Drawer titles / empty text match “Alerts” wording (same feature, clearer words). | Low–med |
| **5** | **Super-admin unlock plan** | Design only first: how a locked admin gets back in **without** editing secret files. No build until you approve. | Disc only |

### C — Parked / do not touch unless you say the genre

| # | Name | What it does (plain) | Why wait |
|---|------|----------------------|----------|
| **6** | Live video speed (ZLM) | Try to make live picture appear faster | Parked — easy to break live wall |
| **7** | Map pin overlap | Pins stacking on map | Parked unless Open All / pin live fails |
| **8** | Face / FR big queue | Face screen layout and alerts | Separate genre — say “FR” when ready |
| **9** | Rebuild Test 2 zip | New client zip from ME8 | Only after you want a **new** trial drop |

---

## My recommendation (tonight)

**#1–#3 low-risk pack — DONE** (start-safe, login-brand, start-readme).  

**Next (optional):** **#4 Missed Alerts polish** — or stop for tonight / pick FR or another genre when ready.

---

## Not on this list (on purpose)

- Re-nag SOS / authenticator every day — forbidden  
- Touching locked live / PTT core files for “cleanup”  
- Mixing Test 2 and lab on the same ports  

---

## Your call

Reply with one of:

- **`MOB-APPLY start-safe`** → we do #1  
- **`MOB-APPLY login-brand`** → we do #2  
- **`MOB-APPLY start-readme`** → we do #3  
- Or name another row  

---

## Related

- `docs/ME8-TODAY-QUEUE.md`  
- `docs/MOB-DISC-RESTART-EADDRINUSE-ZOMBIE.md`  
- `docs/MOB-DISC-TEST2-UPDATE-NOT-VIRUS.md`  
- `docs/MOB-DISC-MISSED-BELL-NO-LABEL.md` (done)  
