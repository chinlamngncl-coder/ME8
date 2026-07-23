# MOB DISC — Pin density: no tiny video (policy B)

**Status:** APPLIED — `MOB-APPLY-PIN-POPUP-DENSITY-NO-TINY-VIDEO` · policy **B** · 2026-07-19  
**Boundary:** Density CSS + thresholds only — no pin play / mirror / ZLM / SOS / PTT

---

## Locked ladder (APPLIED)

| Open pins | Video height | Notes |
|-----------|--------------|--------|
| **1–4** | **136px** | Full design layout (classic) |
| **5–6** | **120px** | Mild scale (`map-popup-compact`) |
| **7–8** | **110px** | Milder than old 80 (`crowded-heavy`) |

Thresholds: `PIN_POPUP_CROWDED_MIN = 5`, `PIN_POPUP_CROWDED_HEAVY_MIN = 7`  
Cluster trigger aligned to **≥5** (was ≥3 — that wrongly crushed 3 colocated).  
Narrow viewport floor also **120** (was 96).

**Removed:** 96px / 80px postage sizes.

---

## Files

- `public/index.html` — CSS heights + density JS  
- `public/js/dashboard-boot.js` — density thresholds parity  

**Operator:** hard refresh → 1–4 pins = 136; open 5th → 120; open 7th → 110.

---

## One line

Scale gently: **136 → 120 → 110**; never 80/96.
