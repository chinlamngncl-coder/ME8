# MOB DISC — What is “Restart UbitronC2”? (baby steps)

**Status:** LOCKED 2026-07-16  
**Search:** `what is UbitronC2`, `restart service`, `i don't know how`, `didn't create`  
**You are not tech:** agent must not assume you know Windows service names.

---

## Plain English

| Word | Meaning |
|------|---------|
| **UbitronC2** | The **Windows name** of the Mobility Axiom **server** that runs in the background on this PC (lab install). You did not invent the name — install scripts did. |
| **Restart** | Stop that server, start it again, so **new code** on disk is loaded. Like rebooting only the app, not the whole PC. |
| **Why I ask** | Some fixes are **server** files. Refresh alone only reloads the **web page**. Server needs a restart for those. |

If the desk already runs and you only changed **page** files (JS/CSS), sometimes **hard refresh** is enough.  
When I say restart UbitronC2 — I mean the **server** must reload.

---

## How **you** restart (pick one — easiest first)

### Way A — double-click (preferred)

In the ME8 folder on the Desktop:

1. Find **`RESTART-FLEET.bat`**  
2. Double-click it.  
3. If Windows asks “Allow?” / UAC → click **Yes**.  
4. Wait until the window finishes (or closes).  
5. Hard refresh the browser once.

That bat prefers the service when installed — you do **not** type `UbitronC2`.

### Way B — Stop then Start

Same folder:

1. Double-click **`STOP-UBITRON-SERVICE.bat`** (Yes on UAC if asked).  
2. Then double-click **`START-UBITRON-SERVICE.bat`** (Yes if asked).  
3. Hard refresh once.

### Way C — you can’t / don’t want to

Say: **“I can’t restart — you do it”** or **“no service bat”**.  
Then I stop asking you for UbitronC2 by name and we use whatever start method you already use every day (same Start you use for the desk).

---

## What you do **not** need

- Open Services.msc  
- Type `net stop`  
- Learn what “elevated” means beyond clicking **Yes** on the Windows prompt  
- Create the service yourself  

---

## Agent rule (locked)

Never say only “Restart UbitronC2” with no path.  
Always point to **`RESTART-FLEET.bat`** (or Stop/Start bats), or accept “I can’t.”

---

## One line

**UbitronC2 = background server name. You restart it by double-clicking `RESTART-FLEET.bat` (Yes on UAC) — or say you can’t.**
