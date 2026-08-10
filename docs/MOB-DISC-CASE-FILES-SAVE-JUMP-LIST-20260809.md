# MOB DISC — Save field report: require text + jump to list (2026-08-09)

**Status:** APPLIED — see `MOB-DISC-CASE-FILES-SAVE-JUMP-LIST-APPLY-20260809.md`.  
**Operator:** After save, jump to Case Files list. Also: **do not allow empty save** — force real input; otherwise show a hint on the form.

---

## Today (code fact)

`public/js/case-files-ui.js` → `saveCase()`:

1. PATCH with whatever is on the form (empty narrative OK)  
2. “Saved” text stays on the **same** detail form  
3. Reloads detail — **no** jump to list  

Pain: (a) unclear if save worked; (b) one click can “save” with nothing written.

---

## Locked product behavior (one APPLY)

### A. Must write something (before PATCH)

| Rule | Lock |
|------|------|
| Required field | **Field report narrative** (`#cf-narrative`) — trim whitespace; must be non-empty |
| Not enough alone | Title / officer / device / status / SOS link without narrative |
| Empty click Save | **Block** — stay on form; show plain hint (no jump, no PATCH) |
| Hint words (EN) | e.g. **Write the field report before saving.** (i18n key; no lab jargon) |
| Focus | Put cursor in the narrative box when blocked |

**Why narrative:** that box *is* the field report. Title often exists from create — requiring only title would still allow empty reports.

### B. After a real save succeeds

1. PATCH as today.  
2. **Jump to Case Files list** (same panel, list view).  
3. Optional short “Saved” on list — plain words.  
4. PATCH failure → stay on form + error (no jump).

### C. Out of scope

Cases desk, SOS wire, dock, force every metadata field.

---

## APPLY (when you say go)

`MOB-APPLY CASE-FILES-SAVE-JUMP-LIST-V1`

Touch: `case-files-ui.js` (+ `en.json` hint if needed) + cache-bust.

---

## Operator check (after APPLY)

1. Open case → clear narrative → Save → **stays**; hint shows; nothing “saved empty.”  
2. Type report → Save → **Case Files list**.  
3. Re-open → narrative still there.
