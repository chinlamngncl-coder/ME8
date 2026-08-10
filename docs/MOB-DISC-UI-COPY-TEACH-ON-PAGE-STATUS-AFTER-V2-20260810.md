# MOB DISC — Teaching-on-every-page status (after V1+V2) (2026-08-10)

**Status:** LOCKED status. **No code this turn.**  
**Read:** `.cursorrules` UI COPY PROFESSIONAL — UI = short labels; manuals = teach.  
**Ask:** Have we taken out the long every-page teaching essays?

---

## Answer

**Yes — for the long essays we targeted.**

| Pass | What was removed / shortened | Status |
|------|------------------------------|--------|
| **V1** | Bombs: I've done this, later steps, LAB CONSOLE, Super-admin essays, chatty gates | APPLIED |
| **V2** | All `hint` / `intro` / `Note` strings **≥ 140 characters** (33 keys) → one enterprise line | APPLIED |

**Verify (post-V2):** `en.json` hint/intro/Note keys with length **≥ 140 = 0**.  
Examples now short: `bwc.hint`, `evidence.pathsHint`, Wall / Groups / Cloud / Firmware intros.

**Hard lock held:** words only — layout/UX/`id`/`data-*` unchanged (`.cursorrules`).

---

## What you may still see (not the old walls)

| Still on UI | Why |
|-------------|-----|
| **~77 mid lines** (about 90–139 chars) | One or two calm sentences — under V2 cutoff. Not the old multi-sentence teach blocks. |
| **Title + one short hint** | Enterprise pattern (industry disc) — OK |
| **Manuals / Install / User guides** | **Must still teach** — that is correct; not every-page UI |

If a panel still *feels* like a lecture after hard refresh, name the page — optional **`UI-COPY-PROFESSIONAL-PASS-V3`** for mid-length (90–139) only, after **OK to Grep**.

---

## What we did **not** do

- Did not gut manuals.  
- Did not delete hint `<p>` elements (would risk empty gaps / broken i18n).  
- Did not change scrolling or form grids.

---

## Operator check

Hard refresh → open Settings BWCs, Evidence Storage, Groups, Video wall: intros should read as **one short line**, not a how-to chapter.
