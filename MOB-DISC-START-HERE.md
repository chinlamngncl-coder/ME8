# MOB notes — start here

**You are not expected to read code.** Plain-English notes for you and the next agent.

**Folder:** Desktop → Enterprise Mobility → **ME8**

---

## If video broke (wall “STOPPED BY BWC” / pins dead)

Tell the agent exactly:

**`RUN RESTORE-ME8-FIRMWARE-GOLD`**

Then run **`RESTART-FLEET.bat`** and hard refresh once (Ctrl+Shift+R).

---

## What to open

| Topic | File |
|-------|------|
| **Live pins / Open All** | `docs\MOB-DISC-FIRMWARE-GOLD-PIN-MIRROR.md` |
| **ZLM — failed, do not use yet** | `docs\MOB-DISC-ZLM-NOT-READY.md` |
| **TOTP off for testing** (back on before ship) | `docs\MOB-DISC-TOTP-SUSPENDED-BENCH.md` |
| **What to ask Google next (ZLM)** | `docs\MOB-DISC-ASK-GOOGLE-ZLM.md` |
| **Google pin answers** | `docs\MOB-DISC-GOOGLE-PIN-CANVAS-MIRROR-VERIFY.md` |
| **Put video back** | `BASELINE-ME8-FIRMWARE-GOLD.md` |

---

## One sentence each

- **Pin mirror** — what fixed map video; what agents must not break again.  
- **TOTP** — **off on bench** for now (password only). **Must turn back on before ship.**  
- **Firmware Gold** — restore instructions.

---

## You do not do

- Docker  
- Edit `.env`  
- DevTools / logs  
- “Try later” steps from agents  

Agent owns tech. You: restart, refresh, pass/fail.

---

*Agents: search `MOB-DISC`. Never ask operator to install ZLM sidecars.*
