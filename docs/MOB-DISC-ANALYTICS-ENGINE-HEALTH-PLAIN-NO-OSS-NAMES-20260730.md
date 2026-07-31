# MOB DISC — Operator health: no open-source engine names

**Date:** 2026-07-30  
**Status:** **APPLIED** via `ANALYTICS-ENGINE-HEALTH-PLAIN-V1` (2026-07-30)  
**Search:** ANPR health, FR health, FastALPR, shipDefault, sidecar status  
**Operator:** Using open source is fine — **do not name** engines on the product face. Health should read like **ANPR Engine — OK**, **FR Engine — OK**, etc.  
**Related:** `MOB-DISC-ANPR-FASTALPR-SHIP-DEFAULT-V1-APPLIED.md` · `MOB-DISC-ANALYTICS-ENGINE-HEALTH-PLAIN-V1-APPLIED.md` · OEM / brand rules

---

## Plain English

1. **Agreed.** Customer / operator UI must not advertise **FastALPR**, Paddle, YOLO vendor packs, Seeta, etc.  
2. Internal code, logs, and tech diagnostics may keep real engine tags for support.  
3. Operator-facing health = **capability OK / not OK** only.

---

## Desired operator copy

| Surface | Show | Do not show |
|---------|------|-------------|
| Analytics → ANPR status | **ANPR Engine — OK** / **ANPR Engine — Not available** | `fastalpr-ship-v1`, FastALPR, Paddle, YOLO model names |
| Analytics → Face / FR status | **FR Engine — OK** / **FR Engine — Not available** | Sidecar library names, Facenet/Seeta brand strings |
| Optional later (header / admin) | Same pattern per module | Open-source project names |

Soft fail / plate-read errors stay operational (“no plate”, “format”, etc.) — still **no** engine brand in those strings.

---

## Where names leak today (fix targets)

| Place | Risk |
|-------|------|
| `GET /api/analytics/anpr/health` JSON (`engine`, `fastalprDet`, `ocrModel`, `shipDefault`) | If UI prints raw JSON fields |
| Analytics hub status line | Must map `ok` → generic OK text only |
| Tech / lab diagnostics | **May** keep real names (super-admin / tech only) |
| Server logs / MOB discs | Internal — OK |

---

## Recommended MOB (one path)

### `ANALYTICS-ENGINE-HEALTH-PLAIN-V1`

| # | Change |
|---|--------|
| 1 | ANPR status UI: **ANPR Engine — OK** when health `ok`; else **ANPR Engine — Not available** (existing service-down i18n OK if rewritten to this pattern) |
| 2 | FR status UI: **FR Engine — OK** / **Not available** — same rule |
| 3 | Do **not** render `engine`, `fastalprOcr`, `yoloKind`, model IDs in operator Analytics chrome |
| 4 | API may keep detailed fields for tech; UI ignores them for operators |
| 5 | Optional: tech diagnostics page only shows vendor/engine detail |

**Do not:** rename product to hide Axiom · strip logs · change FastALPR ship default behavior.

---

## PASS / FAIL

| Check | PASS |
|-------|------|
| Analytics ANPR ready | Shows **ANPR Engine — OK** (or equal plain wording) |
| Analytics FR ready | Shows **FR Engine — OK** |
| No FastALPR / Paddle / YOLO brand in Analytics status | None visible |
| Tech/lab health (if any) | May still show detail |

---

## Operator decide

When ready:

- **`MOB-APPLY ANALYTICS-ENGINE-HEALTH-PLAIN-V1`**

**No code in this disc.**

---

## Lock record

| Item | Decision |
|------|----------|
| Name OSS engines on operator UI | **Forbidden** |
| Plain OK / Not available | **Required** |
| MOB | **`ANALYTICS-ENGINE-HEALTH-PLAIN-V1` APPLIED** — see `MOB-DISC-ANALYTICS-ENGINE-HEALTH-PLAIN-V1-APPLIED.md` |
