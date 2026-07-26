# MOB-APPLIED — LICENSE-TACTICAL-BASIC-COMMAND-V1

**Date:** 2026-07-26  
**APPLY:** `MOB-APPLY LICENSE-TACTICAL-BASIC-COMMAND-V1`  
**Disc (generator):** `MOB-DISC-LICENSE-GENERATOR-BASIC-COMMAND-20260726.md`  
**Floor plan genre:** **PASS** (operator)

## Generator answer (locked)

| Question | Answer |
|----------|--------|
| New generator? | **No** |
| Update `tools/generate-license.js`? | **Yes** — `--tactical-plan` / `--tactical-pin-live-cap` |
| Pin cap in `features{}`? | **Never** (booleans only) — top-level `tacticalPinLiveCap` |

## Delivered

| Piece | Change |
|-------|--------|
| `lib/licenseManager.js` | Optional `tacticalPinLiveCap` in canonical; `getTacticalPinLiveCap` / `getTacticalPlan`; entitlements API fields |
| `tools/generate-license.js` | `--tactical-plan basic\|command`, `--tactical-pin-live-cap N`, `--org-id` |
| `public/js/license-entitlements-ui.js` | Tactical tab **stays**; Overwatch (`#ax-tactical-ar-open`) greys; banner shows plan + pin cap |

## Issue examples

```text
# Basic
node tools/generate-license.js ... --tactical-plan basic --out storage/license.lic

# Command
node tools/generate-license.js ... --tactical-plan command --out storage/license.lic
```

## Not this MOB

`TACTICAL-PIN-LIVE-CAP-FROM-LICENSE-V1` — wire `CIRCLE_OPEN_CAP` from entitlement (next).

## Verify

```text
npm run verify:license-tactical-basic-command
```

## Smoke

1. Restart → Ctrl+F5  
2. Lab: Tactical + Overwatch usable; banner hidden  
3. Optional: issue Basic test `.lic` → Overwatch greys, Tactical still open; banner shows Basic + pin 8  

Reply **PASS** / **FAIL**.
