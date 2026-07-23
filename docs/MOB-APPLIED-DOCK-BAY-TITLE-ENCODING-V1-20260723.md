# MOB APPLIED — DOCK-BAY-TITLE-ENCODING-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY DOCK-BAY-TITLE-ENCODING-V1`  
**Also:** full `public/` UI mojibake scan (operator asked)

## What it was

Not an icon. Empty dock bay title used an em dash (`—`) that had been **double-encoded** (UTF-8 read as Windows-1252, then saved again), so the UI showed garbage like `â€"`.

Same rot was widespread in `public/index.html` and related JS (arrows, ×, ellipsis, grip dots, etc.).

## What changed

1. **Dock bay title** — `#ev-dock-bay-title` is now `&mdash;` (renders as a clean dash / empty placeholder).
2. **Full scan + repair** of `public/**/*.html` and `public/**/*.js`:
   - Decoded classic mojibake trigrams (em/en dash, ellipsis, arrows, ×, icons, …).
   - Hardened HTML text to **entities** (`&mdash;`, `&rarr;`, `&times;`, …).
   - Hardened JS string literals to **`\uXXXX`** escapes (e.g. evidence empty cells `'\u2014'`).
3. Pass-2 fixed a few sequences pass-1 partially broke, plus leftovers (curly quotes, ←, ✕, ⌖, grip `⠿`, minimize bar).

**Scripts (lab tools, not product runtime):**  
`scripts/fix-ui-mojibake-v1.js`, `scripts/fix-ui-mojibake-v1-pass2.js`, diag/verify helpers.

**Locales:** already clean Unicode em dashes — no mojibake; left as-is.

**Cache bust:** `evidence-hub`, `video-wall`, `fr-alarm`, `fleet-ui`, `server-setup`, `command-wall`, `analytics-hub` → `?v=20260723-dock-bay-title-encoding-v1`

## Operator verify

1. **Ctrl+F5** (no Fleet restart required for UI-only).
2. Evidence → Docks: empty bay title = clean dash (or blank look), **not** `â€"`.
3. Spot-check: sidebar collapse ◀, FR tile ×, “Back to Settings” ←, map reset ↺, wall play/stop still normal.

**PASS** = no garbage `â€` / `Ã—` / `â†` glyphs in the chrome.  
**FAIL** = still see mojibake after Ctrl+F5.
