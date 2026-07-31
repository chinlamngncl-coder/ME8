# MOB DISC — Where Analytics engine health strings appear

**Date:** 2026-07-30  
**Status:** **FACT** (no code) — clarifies why operator cannot see “FR Engine — OK” on Face  
**Related:** `MOB-DISC-ANALYTICS-ENGINE-HEALTH-PLAIN-V1-APPLIED.md` · offline PASS `MOB-DISC-FR-OFFLINE-HIT-ALERT-ONLY-V1-APPLIED.md`

---

## Plain English

1. **Engine health strings are in the product** — they are not on the default **Face recognition** screen.  
2. Operator looking at Face (live tiles / offline video) will **not** see **FR Engine — OK**. That is expected with current layout.  
3. Offline-hit PASS does not depend on those status lines.

---

## Where to look (today)

| String | Tab / panel | Element |
|--------|-------------|---------|
| **FR Engine — OK** (etc.) | Analytics → **Verify 1:1** | `#ax-fr-sidecar-status` under the verify hint |
| **ANPR Engine — OK** (etc.) | Analytics → **ANPR** | `#ax-anpr-status` under the ANPR hint |
| Face recognition (live / offline) | Analytics → **Face recognition** | **No** engine health line in the chrome |

Hard refresh first. Open **Verify 1:1** (not Face) to confirm FR wording; open **ANPR** for plate wording.

---

## Why Face feels empty

- `#ax-fr-sidecar-status` lives inside `#ax-panel-verify` (hidden until Verify is selected).  
- Opening Face still refreshes that element in the DOM, but the panel is hidden — so nothing visible.  
- That is a **placement** issue for “always see health on Face,” not a missing APPLY of the plain strings.

---

## Optional later MOB (do not APPLY unless requested)

### `ANALYTICS-ENGINE-HEALTH-VISIBLE-ON-FACE-V1`

Show a plain **FR Engine — OK / Not available** line on the Face panel (and keep Verify/ANPR), so operators do not have to open Verify to see health.

**No code in this disc.**

---

## Lock record

| Item | Decision |
|------|----------|
| Plain strings exist | **Yes** — Verify + ANPR panels |
| Visible on Face by default | **No** (today) |
| Offline hit alert-only | **PASS** (separate MOB) |
