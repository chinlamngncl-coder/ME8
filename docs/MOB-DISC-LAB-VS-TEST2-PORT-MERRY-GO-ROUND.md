# MOB DISC — Lab vs Test 2 port merry-go-round (login hint + wrong password)

**Status:** **LAB INCIDENT / PROCESS** — not “ME8 auth randomly broke.”  
**Date:** 2026-07-12  
**Search:** EADDRINUSE, zombie, SessionId 0, login hint, global123, Test 2 vs ME8, merry-go-round  
**Related:** `MOB-DISC-RESTART-EADDRINUSE-ZOMBIE.md`, `MOB-DISC-SHIP-REMINDERS-NO-NAG.md`, pre-ship gate B8

---

## Plain answer

**You are not on a healthy ME8 right now.**

| What you did | What actually happened |
|--------------|------------------------|
| Ran ME8 `RESTART-FLEET` / Start window | New ME8 process **failed** to bind **3988 / 5060 / 3989 / …** (`EADDRINUSE`) |
| Opened `http://localhost:3988` | Browser hit the **old elevated zombie** still holding the port — **not** the ME8 window that just printed the errors |
| Expected lab password | Zombie may be serving **different `storage/`** (often Test 2 / factory) → login fails |
| Saw “First install: global123…” hint | That text was added for **customer first install** and is currently **always shown** on login — wrong for returning lab users |

**Test is Test. ME8 is ME8.** Separate folders. They only collide when **both fight for the same Windows ports**, and the loser still “looks like” a dashboard because something else already answered on 3988.

---

## Does enterprise software behave like this?

**No — not when ops is done right.**

| Enterprise norm | What went wrong here |
|-----------------|----------------------|
| One service instance; restart **stops then starts** the same service | Lab uses console `node` + sometimes **Run as Admin** → orphan in SessionId **0** |
| Non-admin restart cannot leave an immortal Admin process | `RESTART-FLEET` / normal `taskkill` = **Access denied** on that PID |
| Login copy matches audience | Ship hint pasted onto **every** login (lab + customer returning) |
| Pack smoke never mutates lab identity store | Ship debugging earlier **reset / confused** lab login expectations vs factory `global123` |

Google/docs will not invent a magical second ME8. This is **Windows port ownership + elevated process + always-on ship copy**.

---

## Why the “stupid hint”

- Locale key: `login.hintPassword` — *“First install: password is global123…”*
- Added for PH/KR trial so clients understand factory vs changed password.
- **Bug / UX debt:** shown to **all** users, including lab operators who already changed password years ago.
- **Future MOB (not this firefight):** show only when `mustChangePassword` / factory default, or only in ship builds — **never** nag returning lab users.

---

## Why your old ME8 password “doesn’t work”

Most likely chain:

1. Elevated zombie still owns **3988** (SessionId 0).
2. Your new ME8 log proves **it did not get 3988**.
3. Browser → zombie’s users file (often Test 2: `global` + `mustChange=true` + factory hash) **or** a half-dead bind mess.
4. Lab ME8 `storage\dashboard-users.json` still has your lab users (`global`, `ncl`, …) on disk — **unused** until **that** ME8 process actually listens.

So: **not** “ME8 forgot your password.” **Wrong process answering the browser.**

---

## Immediate recovery (do in order)

1. Close **all** Mobility / Ubitron / ME8 / Test 2 black windows.  
2. Desktop → **`KILL-FLEET-ADMIN.bat`** → **Right-click → Run as administrator**.  
3. Confirm nothing listening:  
   `netstat -ano | findstr "LISTENING" | findstr ":3988 :5060 :3989"`  
   → empty. If not → **reboot once**.  
4. Start **only** lab:  
   `C:\Users\user\Desktop\Enterprise Mobility\ME8\RESTART-FLEET.bat`  
5. Log must **not** contain `EADDRINUSE` for 3988/5060.  
6. Hard-refresh `http://127.0.0.1:3988` → login with **your lab** password (and TOTP if enabled; lab may have `FM_TOTP_SUSPENDED`).  
7. Do **not** start Mobility Test 2 while lab is up.

---

## Hard rules (locked)

| Rule | |
|------|--|
| Lab ME8 folder | `Desktop\Enterprise Mobility\ME8` |
| Test 2 folder | `Desktop\Mobility Test 2` — separate product pack |
| Ports | **One owner** — never both |
| Elevated Start | Avoid; if used, only Admin kill clears it |
| Ship smoke | Must not rewrite lab `dashboard-users.json` without explicit user order |
| Login hint | Future: first-install / ship only — park until MOB-APPLY |

---

## Record

| Item | Result |
|------|--------|
| User symptom | Invalid sign-in + factory hint + EADDRINUSE after “ME8 start” |
| Root | Zombie on 3988 + always-on ship hint + Test/lab port collision |
| Enterprise? | No — process hygiene failure, not auth cryptography |
| Fix now | Admin kill / reboot → clean ME8 only |
| Fix later | Conditional login hint; stronger RESTART (refuse start if ports busy) |

---

## Related

- `docs/MOB-DISC-RESTART-EADDRINUSE-ZOMBIE.md`  
- `ME8-INTERNAL/ship-desk/PRE-SHIP-GATE-CHECKLIST.md` §B8  
- Desktop `KILL-FLEET-ADMIN.bat`  
