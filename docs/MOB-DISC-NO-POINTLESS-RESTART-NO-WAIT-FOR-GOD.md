# MOB DISC — No pointless restart · no “wait for God”

**Status:** LOCKED 2026-07-17 ~00:56  
**Search:** `why restart`, `nothing then wait`, `not logical`, `wait for god`  
**Trigger:** Operator — clear/reregister not finished, agent still said RESTART-FLEET

---

## What went wrong (admit)

| Agent said | Reality |
|------------|---------|
| `RESTART-FLEET.bat` after stale-clear MOB | **Wrong ask.** Clear ran against **WVP Docker API already live**. Fleet Node restart does **not** create LAN REGISTER or `wvp-zlm primary`. |
| Soft open “as usual” after clear | Picture stays Plan B — **same as before** for the operator. Restart changes nothing they can pass/fail for Plan A. |
| “Next MOB later…” without finishing reregister | Feels like **stop + wait for God**. Fair anger. |

**Rule broken:** Operator restart only when **Fleet process must load new code** they need to test **now**. Not as a ritual after every Docker/API MOB.

---

## When restart is OK to ask

Ask **`RESTART-FLEET.bat`** only if **all** are true:

1. Files under running Fleet (e.g. `server.js` / `lib/*` loaded by Node) **changed**, and  
2. Operator must soft-open / click something that **uses that new code**, and  
3. Without restart, their test is **invalid** (old process still running)

## When restart is FORBIDDEN to ask

- Change was only **Docker / WVP API / already applied live**  
- Next step is **still blocked** (e.g. no LAN REGISTER) — restart won’t unblock  
- Agent has **no pass/fail the operator can see** after restart  
- “Just in case” / habit / closing sentence filler  

If only lab API was added but Plan A still impossible → say **no restart needed** until the next APPLY that actually completes the path.

---

## Forbidden language / habits

- Restart → “then soft open” → nothing new on screen → “next MOB when ready”  
- Menus that end in give up / wait / God / park without **one concrete unfinished step the agent owns**  
- Claiming MOB “done” when the **named outcome** (e.g. LAN register / `wvp-zlm primary`) did not happen — say **partial: clear PASS, register FAIL**  

---

## This MOB state (honest, one line)

**`mob-wvp-stale-docker-host-clear-reregister-v1`:** clear **PASS** (stale 172.x rows gone). Reregister / Plan A **not PASS**.  
**No Fleet restart required for that clear.** Agent should not have asked.

**Still owed (agent):** SIP LAN source so a register can stick (`mob-wvp-sip-lan-source-ip-v1`) — that is work, not waiting for God.

---

## One line

**No restart unless Fleet code must reload for a real test. No unfinished MOB + ritual restart. No wait-for-God endings.**
