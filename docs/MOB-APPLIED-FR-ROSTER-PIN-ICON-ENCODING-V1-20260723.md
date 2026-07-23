# MOB APPLIED — FR-ROSTER-PIN-ICON-ENCODING-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY FR-ROSTER-PIN-ICON-ENCODING-V1`  
**Disc:** `docs/MOB-DISC-LAB-FR-LEFTOVERS-THEN-SECURITY-20260723.md` (Stage L1)

## What changed

`public/index.html` — FR watch roster pin button pseudo-element:

| Was | Now |
|-----|-----|
| Mojibake `ðŸ“Œ` / `ðŸ“C` | CSS escape `\1F4CC` → **📌** |

No JS, no id/`data-*` changes. Cache: hard refresh of `index.html` (inline CSS).

## Operator verify

1. **Ctrl+F5**
2. Analytics → Face recognition → check a cam in the watch roster  
3. Pin control next to the checkbox = **pushpin 📌**, not garbage text  

**PASS** = clean pin icon. **FAIL** = still `ðŸ` junk.

## Operator result

**FAIL** (2026-07-23) — emoji CSS escape still showed garbage / wrong glyph.  
Superseding fix disc: `docs/MOB-DISC-FR-ROSTER-PIN-ICON-ASCII-AFTER-EMOJI-FAIL-20260723.md`  
Next APPLY: `FR-ROSTER-PIN-ICON-ASCII-V1` (text `PIN` or SVG — **no emoji**).

## Next (after PASS)

Stage L2: `MOB-APPLY FR-LIVE-DEAD-DIAGNOSE-V1` (FR not snapshotting / not matching).
