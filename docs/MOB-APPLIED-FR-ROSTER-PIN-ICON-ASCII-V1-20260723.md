# MOB APPLIED — FR-ROSTER-PIN-ICON-ASCII-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY FR-ROSTER-PIN-ICON-ASCII-V1`  
**Disc:** `docs/MOB-DISC-FR-ROSTER-PIN-ICON-ASCII-AFTER-EMOJI-FAIL-20260723.md`  
**Replaces FAIL:** `FR-ROSTER-PIN-ICON-ENCODING-V1` (emoji CSS)

## What changed

`public/index.html` — `.ax-fr-roster-pin-icon::before`:

| Was | Now |
|-----|-----|
| Emoji / `\0001F4CC` (mojibake) | ASCII **`PIN`** (8px bold) |

No JS / id / `data-*` changes.

## Operator verify

1. **Ctrl+F5**
2. Analytics → Face → watch roster pin cell = letters **PIN**, not `ðŸ` / `ĜCO`

**PASS** = readable PIN. **FAIL** = still garbage.

## Operator result

**PASS** (2026-07-23). Stage L1 closed.

## Next

Stage L2: `MOB-APPLY FR-LIVE-DEAD-DIAGNOSE-V1`
