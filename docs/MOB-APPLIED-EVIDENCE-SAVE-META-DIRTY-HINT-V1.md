# MOB-APPLIED: mob-evidence-save-meta-dirty-hint-v1

**Date:** 2026-07-17  
**Status:** APPLIED  
**Paper:** `MOB-DISC-EVIDENCE-REDACT-PLACEMENT-SAVE-HINT-PROPOSE.md` (section 2)

## What shipped

Quiet, professional hints — **no silent API write** when nothing changed; **no alert pop** for empty redact Save.

| Action | Behavior |
|--------|----------|
| **Save case info** | Snapshot notes / tags / SOS / trim at detail open. If unchanged → inline **“No changes to save.”** · **no PATCH**. Dirty (including clear) → save as before · hint **Saved.** |
| **Save redacted copy** | No blur areas → inline hint under Save (same wording as before, next to button) · **no alert**. Empty reason → **“Choose a redaction reason before saving.”** |

## Files

- `public/js/evidence-hub.js` — baseline / dirty / hints · cache `?v=20260717-save-meta-dirty-hint`
- `public/index.html` — hint styles · cache bust
- `public/locales/*.json` — `saveMetaNoChanges` · `redactNeedReason` (en) · `redactNoRegions` wording

## Not changed

Redact burn / face-follow / Finalize · custody · product brand.

## Operator

1. Hard refresh (Ctrl+F5).  
2. Evidence → open clip → **Save case info** with no edits → see **No changes to save.** (no “Saved” alert).  
3. Edit a note → Save → **Saved.**  
4. Redact → Save with no areas → hint under Save, not a browser alert.

## One line

**Save with nothing changed = quiet “No changes to save”; empty redact Save = inline hint by the button.**
