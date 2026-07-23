# MOB-DISC — Help & About (Enterprise Help / Legal Center)

**Status:** APPLIED 2026-07-23 — see `docs/MOB-APPLIED-HELP-ABOUT-CENTER-V1-20260723.md`  
**Date:** 2026-07-23  
**Product face:** Mobility Axiom (not “C2” in UI)  
**Related:** design-system tokens in `public/css/global.css` (ESTABLISH-GLOBAL-ENTERPRISE-DESIGN-SYSTEM-V1)

## Why this exists

Enterprise operators expect a **functional** hub for version, help, support, and legal — not a marketing “About Us” page.  
License activation / expiry stays an **ops control**, not help content.

## Locked naming

| Do use | Do not use |
|--------|------------|
| **Help & About** | About Us, Company, Marketing “About” |

Rationale: “About Us” reads as corporate brochure. “Help & About” signals version + help + legal in one place.

## Placement (UX)

- Entry point in the **persistent lower Settings area** (same zone as today’s Sign out / Legal Notices).
- Open as either:
  - **in-product full-width panel** (preferred for enterprise-scope + design system), **or**
  - overlay / drawer  
  Both must make **return to previous ops screen** one obvious action (Back / Close — not only browser back).
- Do **not** bury Help & About only behind a random footer on the map.

## Stable URL (keep)

- Keep standalone **`/legal-notices.html`** (already exists).
- Must stay: direct link, printable, usable offline / without Fleet session when possible.
- Help & About hub may **embed or deep-link** to that page; do not delete the stable URL for audits / pack docs.

## What belongs in Help & About

1. Product name + **build / version** (Axiom face)
2. Short help / how-to pointers (ops docs links if we have them)
3. Support contact / escalation (lab-safe placeholders until ship pack fills real values)
4. Legal / OSS acknowledgements → `legal-notices.html` (or in-panel section that mirrors it)
5. Optional: keyboard shortcuts / “what’s new” — only if we already have content; don’t invent filler

## What does NOT belong here

| Topic | Correct home |
|-------|----------------|
| Platform **license** activate / expiry / entitlement | **Administrator Settings → License** (ops strip / license UI) |
| License gate for Analytics modules | Existing gate / Settings — not Help |
| Secrets, FTP passwords, SIP keys | Settings / Storage only |

## Current product facts (today)

- Settings account card: dim link **Legal Notices** → `/legal-notices.html` `target="_blank"` (`server.legalNotices`).
- `public/legal-notices.html` = OSS component table + notices (Mobility Axiom titled).
- No nav label **Help & About** yet; no in-product hub panel.
- Settings health strip has a **License** chip — leave that path as ops, not merge into Help.

## Recommended APPLY (single next)

**`MOB-APPLY HELP-ABOUT-CENTER-V1`**

Scope when approved:

1. Rename Settings entry: **Help & About** (i18n `server.helpAbout` or similar); keep Legal Notices as a section/link inside the hub.
2. Add in-product **Help & About** view/panel under Settings (enterprise classes from `global.css`); Back returns to Settings hub.
3. Keep `/legal-notices.html` stable; hub links to it (and optionally shows a short version + product line in-panel).
4. Do **not** move license activate/expiry into Help & About.
5. Do **not** touch Map / Video Wall.

## Out of scope for V1

- Full knowledge-base CMS  
- New backend routes beyond static HTML / existing version API if already present  
- Rewriting all OSS license text  
- Brand rename away from Axiom  

## Operator verify (after APPLY)

1. Ctrl+F5 → Settings → see **Help & About** (not “About Us”)  
2. Open hub → Back/Close returns to Settings  
3. Legal notices still open via `/legal-notices.html`  
4. License still only under Settings / License ops — not inside Help  

**PASS / FAIL:** _(after APPLY)_

## Agent rule

Discuss / disc = OK. **No file edits** until operator says `MOB-APPLY HELP-ABOUT-CENTER-V1` (or “go ahead” for that exact item).

