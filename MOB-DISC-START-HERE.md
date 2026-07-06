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

## ⏰ Pending re-tests (operator said "remind me later" — 2026-07-07)

1. **SOS ledger scope checkpoint** (skipped 2026-07-06) — scoped operator sees group-only rows + CSV; out-of-scope folder → 403. Say **CHECKPOINT sos-ledger** for click steps.
2. **TOTP bench state** — confirm whether `FM_TOTP_SUSPENDED=1` is active; must be **off** before ship.

---

## Genres and git (plain English)

| Word | Meaning |
|------|---------|
| **MOB DISC** | Notes only — no change until you say **MOB-APPLY** |
| **MOB-APPLY** | One fix on the bench → you test → PASS/FAIL |
| **Genre** | Related MOBs you finished testing (e.g. Centre Summary AI) |
| **lab-git-push-…** | Save that genre to GitHub — **only when you ask** |

**Centre Summary AI genre (2026-07-07):** 1.5B Apache model, ship bundle rules, customer-facing doc scrub, install progress on Centre Summary tab. **CHECKPOINT PASS** on LLM.

To back up this genre: **`MOB-APPLY lab-git-push-centre-llm`**

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
| **Customer-facing naming — no internal stack/OEM in UI or manuals** | `docs\MOB-DISC-CUSTOMER-FACING-NAMING.md` |
| **Risk analysis + what to do when something breaks** | `docs\MOB-DISC-RISK-AND-DEBUG-PLAYBOOK.md` |
| **Centre Summary AI — customers do not download** | `docs\MOB-DISC-CENTRE-LLM-SHIP-NO-CLIENT-DOWNLOAD.md` |
| **Enterprise VMS — six domains + risk order** | `docs\MOB-DISC-ENTERPRISE-VMS-SIX-DOMAINS.md` |
| **SOS clear / keep files / audit** | `docs\MOB-DISC-SOS-LEDGER-GOVERNANCE.md` |
| **Redaction — in-app only (no external tool)** | `docs\MOB-DISC-EVIDENCE-REDACT-IN-APP.md` |
| **Face / ANPR / Weapon — licensed Analytics hub** | `docs\MOB-DISC-ANALYTICS-LICENSE-HUB.md` |
| **Analytics stack UX + industry study** | `docs\MOB-DISC-ANALYTICS-STACK-UX.md` |
| **Module licensing (BWC · VC · Face · ANPR · Weapon)** | `docs\MOB-DISC-MODULE-LICENSING.md` |
| **How to pack + issue license (teach-yourself)** | `ME8-INTERNAL\ship-desk\MOB-DISC-INTERNAL-PACK-AND-LICENSE-STEP-BY-STEP.md` *(start here)* |
| **Internal vs customer docs — who reads what** | `ME8-INTERNAL\ship-desk\MOB-DISC-INTERNAL-DOC-AUDIENCE.md` |
| **Open source notices before ship** | `ME8-INTERNAL\ship-desk\MOB-DISC-OPEN-SOURCE-NOTICES-BEFORE-SHIP.md` |
| **Remove GPL FFmpeg + Qwen 3B (replacements)** | `ME8-INTERNAL\ship-desk\MOB-DISC-COMMERCIAL-SAFE-STACK-REPLACEMENTS.md` |
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
