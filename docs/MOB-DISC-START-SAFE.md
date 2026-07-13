# MOB DISC — Start safe (lab RESTART refuses half-dead boot)

**Status:** **APPLIED 2026-07-12** — `mob-start-safe` / `MOB-APPLY start-safe`  
**Search:** start safe, EADDRINUSE, UbitronC2, RESTART-FLEET, half-dead, ports busy  
**APPLY name:** `mob-start-safe`

---

## Plain answer

**Before lab Start runs the server, it must make sure the door is free.**

If the Windows service is still on, or ports are still taken (cannot kill without Admin), Start **cancels** and tells you what to do — instead of opening a broken window full of port errors.

---

## What it does

1. Try to stop Windows service **UbitronC2** (if present).  
2. Stop old console ME8 on the usual ports.  
3. Check again.  
4. If still busy → **do not start** + plain “BLOCKED” instructions.  
5. If clear → start as before.

---

## Files

| File | Change |
|------|--------|
| `kill-fleet-ports.ps1` | Service stop attempt + refuse if still busy (exit 1) |
| `RESTART-FLEET.bat` | If kill script fails → cancel Start |

Does **not** change Test 2 client zip. Does **not** touch live video / PTT locked files.

---

## How you try it

1. Keep working as now if ME8 is already healthy.  
2. Next time you restart: run `RESTART-FLEET.bat` as usual.  
3. Optional stress test later: `net start UbitronC2` then RESTART — should **BLOCK** until you `net stop UbitronC2`.

---

## Related

- `docs/MOB-DISC-NEXT-QUEUE-PLAIN.md` (#1 done)  
- `docs/MOB-DISC-RESTART-EADDRINUSE-ZOMBIE.md`  
- `docs/MOB-DISC-TEST2-UPDATE-NOT-VIRUS.md`  
