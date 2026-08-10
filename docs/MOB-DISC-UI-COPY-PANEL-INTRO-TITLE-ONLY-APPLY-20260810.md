# MOB DISC — UI-COPY-PANEL-INTRO-TITLE-ONLY-V1 APPLY (2026-08-10)

**Status:** APPLIED (Holds + Retention). Operator PASS pending.

## Done

| Panel | Change |
|-------|--------|
| Investigation holds | `setup-hint` → `hidden`; `evidenceHub.holdsHint` = `""` |
| Retention | `setup-hint` → `hidden`; `evidenceRetention.hint` = `""` |

Kept `data-i18n` on the nodes. No CSS/layout/scroll change — hidden collapses the strip.  
Cursor rule + `.cursorrules` updated: no permanent teach strip under clear titles.

## PASS

Hard refresh → Holds and Retention: **title/nav + toolbar only**, no grey “no need to open folder” / “categories control…” line.

## Later (ask Grep OK first)

Other Evidence/Settings `setup-hint` that only restate the title → optional `…-V2` sweep.
