# MOB-APPLIED — VERIFY-1-TO-1-VISUAL-RESULTS-UI-V1

**Date:** 2026-07-23  
**APPLY:** `MOB-EXECUTE-VERIFY-1-TO-1-VISUAL-RESULTS-UI-V1`  
**Scope:** Analytics → Verify 1:1 frontend only. No FR API / algorithm changes.

## What landed

1. **Local previews** — FileReader on Photo A / B; fixed 220px dropzones; `object-fit: contain` previews (no layout jump).
2. **Results bridge** — `.match-results-display` between the two photos; large score `%`;  
   - `>80%` → `.match-high` (green)  
   - `≤80%` → `.match-low` (red)  
   Verdict text still uses API `verified` (Match / No match).
3. **Reset** — After a score, **Run verify** hides; **Clear & Start Over** (`.btn-secondary`) clears files, previews, score, returns to empty dropzones.
4. Errors / “Comparing…” stay in the compact status line under the actions (API codes unchanged).

## Files

| File | Change |
|------|--------|
| `public/index.html` | Verify workspace markup + CSS |
| `public/js/analytics-hub.js` | Preview / score / clear |
| `public/locales/en.json` | `clear`, `dropHint`, `scoreLabel` |
| cache | `analytics-hub.js?v=20260723-verify-1to1-visual-v1` |

## Operator verify

1. **Ctrl+F5** → Analytics → **Verify 1:1**  
2. Pick Photo A and B → instant side-by-side previews  
3. **Run verify** → color-coded score between images  
4. **Clear & Start Over** → empty dropzones again  

**PASS / FAIL:** _(operator)_
