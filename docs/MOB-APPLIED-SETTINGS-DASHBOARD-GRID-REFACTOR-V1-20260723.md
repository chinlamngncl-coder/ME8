# MOB-APPLIED — SETTINGS-DASHBOARD-GRID-REFACTOR-V1

**Date:** 2026-07-23  
**APPLY:** `MOB-EXECUTE-SETTINGS-DASHBOARD-GRID-REFACTOR-V1`  
**Scope:** Settings landing layout only (CSS/HTML). No routing / backend / data changes.

## What changed

1. **Master grid** `300px 1fr`, gap **32px** — Server sidebar left; main stage right.
2. **Metric chips** moved into the **right column** (no longer spanning over the sidebar): `repeat(auto-fit, minmax(180px, 1fr))`, gap 16px.
3. **Device lifecycle** cards: strict **3-column** grid, gap **24px** (2-col / 1-col at narrower widths).
4. Card actions demoted to **blue text links** bottom-right with `→` (same IDs / `.settings-lifecycle-open` handlers).

Uptime chip label kept (not renamed to “C2 Status” — Axiom brand rule). Header “System OK” strip untouched (global nav).

## Files

| File | Change |
|------|--------|
| `public/index.html` | Settings hub markup + CSS |

## Operator verify

1. **Ctrl+F5** → **Settings**
2. Left: Server block alone  
3. Right: metric row on top, then 3-column lifecycle cards with light Manage → links  
4. Click a Manage / Server Config — same destinations as before  

**PASS / FAIL:** _(operator)_
