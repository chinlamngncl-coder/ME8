# MOB DISC — Stop saying “UbitronC2” to the operator (NO APPLY)

**Status:** DISC only — 2026-07-19 · **no code · no uninstall unless you APPLY**  
**Subject:** `MOB-DISC-STOP-NAGGING-UBITRONC2`  
**Operator complaint:** Agents keep saying “restart UbitronC2” — that name is not on the desk, not the product face, and is exhausting.

---

## Short answer

**UbitronC2 is not a product feature and not something you “open in Cursor files.”**

It is only the **Windows service name** that some earlier MOB installed so ME8 `server.js` can run in the background (NSSM).  
Product face stays **Mobility Axiom** / company **Ubitron**. **C2** is internal junk in a service ID.

When an agent says “restart UbitronC2,” they mean: **reload the ME8 Node server** so new `server.js` code is live.  
They should **never** dump that service ID on you as if it were a button in the app.

---

## Where it came from (not you)

| Item | Role |
|------|------|
| MOB `mob-me8-windows-service` (2026-07-11) | Enterprise “run as Windows service” |
| `INSTALL-UBITRON-SERVICE.ps1` / click bats | Registers Windows service |
| Service **name** | `UbitronC2` |
| Display name | “Ubitron Mobility C2” |
| What it runs | `node.exe server.js` in your ME8 folder |
| Logs | `storage/service-stdout.log`, `storage/service-stderr.log` |

You did **not** invent this. An agent/MOB did for ship/enterprise uptime. Lab then kept it. Agents later treated the service name as “how you restart,” which is hostile UX.

---

## What you should do instead (operator language)

**Do not hunt for “UbitronC2” in the project tree.**

To reload the server after a **server.js** change:

1. Prefer: double-click **`RESTART-FLEET.bat`** in the ME8 folder (Yes on UAC if asked).  
   That script **already** prefers the Windows service when installed — you never type the name.
2. Or: whatever **Start / Stop** bat you already use every day for the desk.
3. Or: tell the agent **“you restart it”** / **“I can’t elevate”** — agent can run the restart with approval.

**Hard refresh the browser** is still required for `public/js/…` changes. Server restart is only for **Node / `server.js` / `.env`**.

---

## Rule for agents (locked intent — DISC)

**FORBIDDEN in operator-facing replies:**

- “Restart UbitronC2” as the only instruction  
- Assuming the operator knows Windows Services / `net stop` / NSSM  

**REQUIRED instead:**

- “Restart the **ME8 server** (double-click `RESTART-FLEET.bat`)”  
- Or: “Hard refresh only” when only frontend changed  
- Or: offer to restart the service **for** the operator  

---

## “Just delete it?”

| Option | Meaning |
|--------|---------|
| **Keep service, stop saying the name** | Recommended for lab if you like desk always-on after reboot. Use `RESTART-FLEET.bat` only. |
| **Uninstall the Windows service** | Possible via `UNINSTALL-UBITRON-SERVICE.ps1` (Admin). Then ME8 is console/`START-….bat` only — **no** background service. |
| **Delete random files named Ubitron*** | **Do not** freestyle — breaks ship scripts / start bats. |

**No uninstall / no delete in this DISC.** If you want the service gone, say explicitly:

**`MOB-APPLY-UNINSTALL-UBITRON-WINDOWS-SERVICE`**

---

## Why today’s Call fix needed a server reload

`MOB-APPLY-ZLM-WATCH-REGISTER-CALL-PTT` changed **`server.js`**.  
A running Node process does **not** pick that up until the **ME8 server process** is restarted — whether that process is “the UbitronC2 service” or a console window. Same need; wrong vocabulary.

Frontend-only MOBs → hard refresh only. No service talk.

---

## Status

**DISC only.**  

**UbitronC2 = hidden Windows service ID, not your product UI.**  
Agents must stop nailing you with that name.  
Uninstall only on your named APPLY — not silent delete.
