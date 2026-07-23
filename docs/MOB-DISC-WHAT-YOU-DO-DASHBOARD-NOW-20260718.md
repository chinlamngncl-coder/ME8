# MOB DISC — What you do now (dashboard)

**Date:** 2026-07-18  
**Status:** Operator steps only  
**Ask:** Contradicting URLs · burning time · what do I do?

---

## No contradiction

| Where | Type this |
|-------|-----------|
| **Your Chrome on this PC** | `http://192.168.1.38:3988` |
| **BWC cam settings** | `192.168.1.38` (ports as before) |

Do **not** use `localhost` / `127.0.0.1` on the **camera**.  
On the **PC browser**, `127.0.0.1:3988` also works — but **stop switching**. Use **one** address only:

### Use this only
**`http://192.168.1.38:3988`**

---

## What you do (now)

1. Open Chrome on the Fleet PC.  
2. Go to: **`http://192.168.1.38:3988`**  
3. If blank / offline → double-click **`RESTART-FLEET.bat`** in the ME8 folder.  
4. Wait until the black window finishes / Fleet is up (**about 15 seconds**).  
5. Open **again**: **`http://192.168.1.38:3988`**  
6. Log in.  
7. Tell me: **online** or **still dead**.

That is all for the dashboard.

---

## “Mid restart” — plain

While Fleet is restarting, the page can fail for a few seconds.  
**Then** = wait, then open the same URL again (step 5).  
Not a new bug. Not a new IP.

---

## Do not do tonight

- Do not hunt localhost vs 127 vs LAN  
- Do not restart WVP for “dashboard offline”  
- Do not change BWC for this  
- Do not turn Soft Open / `FM_LAB_WVP` on  

---

**One line:** Open only `http://192.168.1.38:3988` → if dead, RESTART-FLEET → wait 15s → open same URL → say online or still dead.
