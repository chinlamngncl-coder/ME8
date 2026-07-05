# MOB notes — start here

**You are not expected to read code.** Plain-English notes for you and the next agent.

**Folder:** Desktop → Enterprise Mobility → **ME8**

---

## If video broke (wall “STOPPED BY BWC” / pins dead)

Tell the agent exactly:

**`RUN RESTORE-ME8-FIRMWARE-GOLD`**

Then run **`RESTART-FLEET.bat`** and hard refresh once (Ctrl+Shift+R).

**Then** checkpoint Open All **before** any auth MOB. Auth (SMTP, TOTP bench) is re-applied **after** video PASS — see `docs\MOB-DISC-BWC-STOPPED-FLICKER.md` → Recovery genre.

---

## What to open

| Topic | File |
|-------|------|
| **Live pins / Open All** | `docs\MOB-DISC-FIRMWARE-GOLD-PIN-MIRROR.md` |
| **“Stopped by BWC” while testing (read this if alt-tabbing)** | `docs\MOB-DISC-BWC-STOPPED-FLICKER.md` |
| **ZLM — failed, do not use yet** | `docs\MOB-DISC-ZLM-NOT-READY.md` |
| **TOTP off for testing** (back on before ship) | `docs\MOB-DISC-TOTP-SUSPENDED-BENCH.md` |
| **What to ask Google (ZLM + “Stopped by BWC”)** | `docs\MOB-DISC-ASK-GOOGLE-ZLM.md` |
| **Super admin forgot password / lost phone** | `docs\MOB-DISC-SUPER-ADMIN-RECOVERY.md` |
| **SMTP settings — where in UI (this MOB)** | `docs\MOB-DISC-SMTP-SETTINGS-UI.md` |
| **ZLM architecture (awaiting “Approved”)** | `docs\MOB-DISC-ZLM-ARCHITECTURE-PROPOSAL.md` |
| **Google pin answers** | `docs\MOB-DISC-GOOGLE-PIN-CANVAS-MIRROR-VERIFY.md` |
| **Put video back** | `BASELINE-ME8-FIRMWARE-GOLD.md` |

---

## One sentence each

- **Pin mirror** — what fixed map video; what agents must not break again.  
- **Super admin lockout** — email recovery + install kit + Settings reset (planned; see doc). **Not** `.env` or restart.
- **Ask Google** — ZLM + **“Stopped by BWC”** flicker (paste in doc).  
- **Stopped by BWC** — often **Opera backgrounded** (Cursor focus); log proved server still live at 1:20 AM. See flicker doc.  
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
