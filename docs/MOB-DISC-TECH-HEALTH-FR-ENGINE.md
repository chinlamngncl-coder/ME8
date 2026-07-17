# MOB DISC — Platform health: where it is · add `FR engine: OK`

**Status:** **APPLIED** 2026-07-13 — `mob-tech-health-fr-engine-card`  
**Date:** 2026-07-13  
**Trigger:** Operator screenshot of **Platform health** — wants **FR engine** card, no brand names  
**Search:** Platform health, ss-tech-health, tech-diagnostics, FR engine OK  
**Related:** `MOB-DISC-FR-ENGINE-LAB-ENABLE-ONNX.md`, brand naming rule

---

## Where is “Platform health”?

| Layer | Path |
|-------|------|
| **UI** | **Settings → Server Config → Diagnostics** (tech PIN) → **Platform health** |
| **DOM** | `#ss-tech-health` |
| **Render** | `public/js/tech-diagnostics.js` → `loadHealth()` |
| **API** | `GET /api/tech/health` → `platformHealth.collectHealth` + FR enrich |

---

## APPLIED — `mob-tech-health-fr-engine-card`

| File | Change |
|------|--------|
| `server.js` | Async tech health; `health.fr` = `{ status, featureEnabled, ok, engine }` via `frSidecarClient.health()` |
| `public/js/tech-diagnostics.js` | Card **FR engine** → OK / Down / Off |
| `public/locales/en.json` | `tech.health.frEngine`, `frOk`, `frDown`, `frOff` |
| `public/index.html` | cache-bust tech-diagnostics |

**UI values:** **OK** / **Down** / **Off** only. No OEM / InsightFace / DeepFace / buffalo on the card. Tooltip may show internal engine id (`onnx` / `deepface`) when OK.

| Condition | Value |
|-----------|--------|
| FR feature off | **Off** |
| Sidecar health ok | **OK** |
| Unreachable | **Down** |

**Not changed:** header System OK, wall, PTT, SOS.

---

## After restart

Settings → Diagnostics → Refresh → **FR engine** card present.
