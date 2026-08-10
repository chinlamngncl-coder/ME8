# MOB DISC — Confirm: FR / ANPR / Weapon alerts, isolation, Ops, tile expand (2026-08-07)

**Status:** disc only. Confirm understanding. No code until you APPLY a named MOB.  
**Read:** `.cursorrules` (global CSS / ids / forms) + ME8 zero-APPLY / no fake SOS / token-lean.

---

## Do I get it? — YES

Plain confirmation:

1. **Alerts** belong on Live hits for FR, ANPR, and (later) Weapon — HQ toast / Ack / send to **Ops** with the **right cam** (BWC name + id; fixed cam too).  
2. **Do not mix pipes.** Live stays Live. Offline stays Offline. FR ≠ ANPR ≠ Weapon. Offline hits must **not** pollute Live rails or auto-jump Ops wall. Live hits must **not** write into Offline investigation as if they were file jobs.  
3. **Ops** already has **BWC pins and fixed cams**. A Weapon (or ANPR / FR live) hit on either type must **pop on Ops** for that cam — not Analytics-only forever.  
4. **Never fake device SOS** from a detect still. Weapon / ANPR / FR field alert ≠ SOS button on the bodycam.  
5. **Weapon live tiles** should click-to-expand like FR / ANPR. Today they do **not**. We prepare a named MOB for that.

---

## Checklist — what is what (you verify)

### A. Isolation (no contamination)

| Rule | Meaning | Status |
|------|---------|--------|
| A1 | FR Live hits → FR Live UI / FR live alert path only | Locked product |
| A2 | FR Offline hits → alert OK; **no** auto Ops wall / no Live rail fill | Locked (`FR-OFFLINE-HIT-ALERT-ONLY`) |
| A3 | ANPR Live hits → ANPR Live UI / live alert path only | Target |
| A4 | ANPR Offline / FTP / file / Image investigation → **not** Live rail; alert-only if watchlist (no auto Ops wall) | Locked intent (`ANPR-OFFLINE-HIT-ALERT-ONLY`) |
| A5 | Weapon Live → Weapon Live only; no FR/ANPR rail pollution | Target |
| A6 | No shared “one hit dumps into every tab” | Locked intent |

### B. ANPR alerts → Ops (like FR)

| Rule | Meaning | Status |
|------|---------|--------|
| B1 | ANPR **Live** list/watch hit → HQ / toast / Ack (FR-shaped triage) | Disc says `ANPR-LIVE-FR-GLOBAL-ALERT-V1` wired to `FrAlarm.onHit` — **you confirm PASS or still FAIL in lab** |
| B2 | Hit must show **which BWC / cam** (name + id) | Required |
| B3 | Live hit can **Go Ops**: map pin + promote live for that cam (same family as FR `goOpsOnHit`) | Required for Live only |
| B4 | ANPR Offline hit does **not** auto Ops / does **not** enter Live | Locked |
| B5 | History / Download / FTP = evidence keep — separate from Live alert toast | Already real; keep separate |

### C. Weapon alerts → Ops (same idea, all cam types)

| Rule | Meaning | Status |
|------|---------|--------|
| C1 | Weapon hit on **BWC** → HQ WEAPON toast + that BWC on Ops pin / live | Not built → `WEAPON-ALARM-NEARBY-V1` |
| C2 | Weapon hit on **fixed cam** → same pop on Ops for that fixed cam (Ops has fixed cams too) | Same MOB — do not BWC-only |
| C3 | Optional nearby PTT / talk to officer — **not** fake SOS | Locked |
| C4 | Confirm + dedupe before auto radio (bull-bar FP risk) | Locked |
| C5 | Weapon photo Keep / Evidence folder = later MOB (`WEAPON-SNAP-KEEP-EVIDENCE-V1`) — not alarm | Separate |

### D. Live tile expand (watch grid)

| Surface | Click tile → expand big? | Status |
|---------|--------------------------|--------|
| FR Live | Yes (`expandedTileId`) | Done |
| ANPR Live | Yes | Done |
| Weapon Live | **No** today | Need MOB |

### E. Popup place vs photo keep (do not mix again)

| Thing | FR | ANPR | Weapon |
|-------|----|------|--------|
| Photo / history keep | Yes (holds / ledger) | Yes (Postgres / Download / FTP) | Not yet |
| Lightbox drag | Yes | Yes | Yes (DRAG-X) |
| Keep place until refresh | FR float yes | ANPR re-centers | ANPR-like today → POS-KEEP MOB |

---

## Prepared MOB names (order I recommend)

| # | MOB | What |
|---|-----|------|
| 1 | `WEAPON-LIGHTBOX-POS-KEEP-V1` | Popup stays where you dragged until refresh (FR float feel) |
| 2 | `WEAPON-TILE-CLICK-EXPAND-V1` | Weapon live tiles expand like FR/ANPR |
| 3 | Operator: Colab B negatives (cars / bull bars) | Kill rubbish gun FP |
| 4 | `WEAPON-ALARM-NEARBY-V1` | WEAPON toast + Ack + Ops pin for **BWC and fixed cams** + optional PTT; never SOS |
| 5 | `WEAPON-SNAP-KEEP-EVIDENCE-V1` | Keep photo like FR holds / ANPR history family |
| — | ANPR alert lab PASS / gap fix | Only if B1 still FAIL for you — separate named MOB after you say what fails |

One APPLY at a time.

---

## One next APPLY (UI, safe)

`MOB-APPLY WEAPON-LIGHTBOX-POS-KEEP-V1`

Or say `MOB-APPLY WEAPON-TILE-CLICK-EXPAND-V1` first if expand matters more to you right now.
