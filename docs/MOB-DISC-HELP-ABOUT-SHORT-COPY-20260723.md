# MOB-DISC — Help & About: short copy (no filler)

**Status:** APPLIED 2026-07-23 — see `docs/MOB-APPLIED-HELP-ABOUT-SHORT-COPY-V1-20260723.md`  
**Date:** 2026-07-23  
**Prior:** PAPER ONLY until APPLY  
**Context:** Operator rejected verbose Support / Legal prose on Help & About (internal tool).

## Problem

HELP-ABOUT-CENTER-V1 added **filler** that reads like a customer brochure:

- **SUPPORT** — whole paragraph telling people not to paste license keys (ops already know).
- **LEGAL** — long “open-source acknowledgements / stable printable page” lecture before the button.

Internal desk: **if there is nothing useful to say, omit the section.** Buttons and one short line beat essays.

## Locked copy rules (Help & About)

1. **No marketing / no lecture.**  
2. **No “do not put passwords here” nags** unless ship/compliance explicitly requires it.  
3. **Legal:** one short sentence **or** just the **Legal Notices** control — not both a paragraph and a button saying the same thing.  
4. **Support:** omit entirely for lab/internal unless we have a real contact string. Placeholder “ask your admin” = delete.  
5. **Help bullets:** keep only if useful in one line each; cut fluff.

## Recommended target (after APPLY)

| Block | Keep? | Copy |
|-------|--------|------|
| Product + Build | Yes | Mobility Axiom · Build `x.y.z` |
| Help | Optional | ≤4 one-line bullets, no essays |
| Support | **No** (internal) | Remove section |
| Legal | Yes | Button **Legal Notices** → `/legal-notices.html`. Optional one line: **Open-source notices.** — nothing longer |
| License note | Optional | One line max: **License: Settings → system status.** Or remove if chip already covers it |

## Single next APPLY

**`MOB-APPLY HELP-ABOUT-SHORT-COPY-V1`**

- Strip Support section.  
- Legal = short line (or none) + **Legal Notices** button only.  
- Trim Help bullets / license note to one-liners.  
- i18n keys updated; no layout/API/map changes.

## Operator verify (after APPLY)

1. Ctrl+F5 → Settings → Help & About  
2. No Support lecture  
3. Legal is short (or button-only)  
4. Legal Notices still opens `/legal-notices.html`

**Agent:** Discuss / disc OK. **No edits** until operator says the APPLY name above.

