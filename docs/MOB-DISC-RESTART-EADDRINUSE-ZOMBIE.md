# MOB DISC — RESTART-FLEET fails with EADDRINUSE (elevated zombie)

**Status:** **KNOWN LAB PAIN** — not a ME8 app bug; port holders left alive.  
**Date:** 2026-07-12  
**Search:** EADDRINUSE, 3988, 5060, RESTART-FLEET, zombie, SessionId 0, KILL-FLEET-ADMIN  
**Do not:** treat as “ME8 broken” or change SIP/PTT code for this symptom alone.

---

## Plain answer

**RESTART-FLEET failed because the old process never died.**  
New ME8 started, logged ffmpeg/ZLM, then could not bind:

| Port | Role | Error |
|------|------|--------|
| **3988** | HTTP dashboard | `EADDRINUSE` |
| **3989** | Video WS | `EADDRINUSE` |
| **3990** | Audio WS | `EADDRINUSE` |
| **5060** | SIP (UDP+TCP) | `EADDRINUSE` |
| **6000** | Messaging | `EADDRINUSE` |
| **29201** | PTT (often same PID) | held by same zombie |

Typical holder: **one `node.exe` with SessionId 0** (started **Run as administrator** earlier — Test 2 smoke, elevated Start, or Admin terminal).  
Normal `RESTART-FLEET.bat` / non-admin `taskkill` **cannot** kill SessionId 0 → ports stay busy → new start looks “broken”.

---

## What you do (lab — every time)

1. Close all Mobility / Ubitron / ME8 black windows.  
2. Desktop → **`KILL-FLEET-ADMIN.bat`** → **Right-click → Run as administrator**.  
3. Confirm ports free (PowerShell):  
   `netstat -ano | findstr "LISTENING" | findstr ":3988 :5060 :3989"`  
   → should print **nothing**.  
4. Then:  
   `C:\Users\user\Desktop\Enterprise Mobility\ME8\RESTART-FLEET.bat`  
5. If Admin kill still fails → **reboot once**, then RESTART-FLEET only (do not start Test 2).

**Rule:** One owner of fleet ports. Lab ME8 **or** Mobility Test 2 — never both. Prefer **not** elevating Start bats unless required.

---

## Why “process kept alive”

ME8 catches `uncaughtException` and stays up so one bad bind does not always hard-crash the whole process. You still get a **half-dead** server (HTTP maybe already taken; SIP/media dead). **Do not use that window** — kill ports, restart clean.

---

## Client note (old trial)

Same idea: stop old windows → Admin kill script if present → rename old folder → install Test 2. See Migration-Guide + personal kill note. Clients usually do not have elevated zombies unless they ran Install/Start as Admin.

---

## Record

| Item | Result |
|------|--------|
| Symptom | RESTART-FLEET + EADDRINUSE 3988/5060/… |
| Cause | Elevated leftover `node` (e.g. PID SessionId 0) |
| Fix | `KILL-FLEET-ADMIN.bat` as Admin, then RESTART-FLEET |
| Code change | Not required for this disc |

---

## Related

- Desktop `KILL-FLEET-ADMIN.bat`  
- `ME8\RESTART-FLEET.bat`  
- Pre-ship gate B8 — smoke on clean port  
