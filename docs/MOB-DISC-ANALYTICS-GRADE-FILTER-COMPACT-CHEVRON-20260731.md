# MOB DISC — Analytics / ANPR selects: compact + real dropdown (not full-width “tabs”)

**Date:** 2026-07-31  
**Status:** DISC only — **no code until** `MOB-APPLY` named below  
**Operator fail:** Plate lists **All grades** = full east–west bar; open list looks like a tab strip; **no chevron** → does not read as “click to choose”  
**Screenshot:** operator 2026-07-31 (Plate lists toolbar)

---

## Apology / learn lock (agent)

This is the **same class of fail** we already spent days killing elsewhere:

| Locked pattern | Where |
|----------------|--------|
| Content-sized controls — **not** full-row stretch | `SETTINGS-UI-THEME-UNIFY-V1` (SIP/ONVIF pills, Save buttons) |
| Content-sized CTAs — **not** full blue bars | `mob-evidence-detail-compact-actions-v1`, Analytics `#app-view-analytics .btn` comment |
| Inputs/selects **capped** (`max-width` ~400–420px) | `.cursorrules` + `me8-enterprise-form-grid.mdc` |
| Dark select **+ custom chevron** | `UI-DARK-FORM-CONTROLS-UNIFY-V1` (`global.css` `select` + SVG arrow) |

**Agent failure:** Plate lists reused Watchlist markup/classes but did **not** check how `enterprise-scope` + panel CSS fight the compact + chevron unify. Shipping another full-width bar is **not** allowed again.

**Future check (mandatory before any Analytics/ANPR/Settings form MOB):**

1. Is the view under `.enterprise-scope`?  
2. Does `.enterprise-scope select { width: 100%; max-width: none }` stretch this control?  
3. Does any panel rule set `background: …` on `select` and **kill** the global chevron?  
4. Does the control look like a **dropdown** (compact width + visible caret) or a **tab/bar**?

If (2) or (3) or “bar/tab” → **fix in the same MOB**, do not ship and “unify later.”

---

## Root cause (verified in code)

1. `#app-view-analytics` has class **`enterprise-scope`**.
2. `public/css/global.css`:

```css
.enterprise-scope select {
    width: 100%;
    max-width: none;
    background: var(--bg-input); /* also replaces background-image → chevron gone */
}
```

3. `#ax-pl-grade-filter` / `#ax-bl-grade-filter` use class `.ax-bl-grade-filter`.
4. Panel CSS sets padding/border/background on `.ax-bl-grade-filter` but **never sets a compact width** (unlike `.ax-bl-enroll select { width: 180px }` and `.ax-bl-search { width: 220px }`).
5. Result: grade filter = **100% of the panel** → full east–west bar; open options = full-width menu; **no caret** → looks like a tab, not a select.

Same bug class hits **Watchlist** grade filter (shared class). Fix both in one MOB — do not ANPR-only-paint.

---

## What we will do (one MOB — after APPLY only)

### Named APPLY

**`ANALYTICS-GRADE-FILTER-COMPACT-CHEVRON-V1`**

(Plain English: make All grades / enroll selects content-sized again and show a real dropdown arrow.)

### Scope (exact)

| Do | Do not |
|----|--------|
| Cap `.ax-bl-grade-filter` (and Watchlist + Plate lists IDs that use it) to **content width** (~180px, same as enroll grade select) — **never** `width: 100%` in toolbar | Redesign Plate lists layout |
| Keep toolbar: search (capped) + grade filter (capped) + Refresh + count — flex row, wrap OK, **no stretch** | Change list APIs / grades / i18n keys |
| Restore **dropdown affordance**: chevron from `UI-DARK-FORM-CONTROLS-UNIFY-V1` must win — use `background-color` + keep `background-image` (or restate the SVG chevron) wherever panel / `.enterprise-scope select` currently wipes it for these Analytics selects | Merge ANPR into FR |
| Spot-check enroll selects under `#ax-pl-enroll` / Watchlist enroll: compact + chevron visible | Invent a second theme |
| Cache-bust `global.css` and/or `index.html` inline CSS as needed | Bundle live ANPR / other product work |

### Files (expected)

- `public/css/global.css` and/or Analytics panel CSS in `public/index.html` — compact width + chevron-safe background for toolbar/enroll selects under Analytics  
- Cache query on `global.css` / page as usual  
- Disc APPLIED note after code

### Operator PASS

1. Hard refresh.  
2. Analytics → ANPR → **Plate lists**.  
3. **All grades** control is a **short** dropdown beside search (not a full-width bar).  
4. Visible **▼ / caret** on the right — clearly a select.  
5. Open menu is **not** panel-wide.  
6. Watchlist grade filter looks the same (compact + caret).

---

## Recommendation

**One APPLY:** `MOB-APPLY ANALYTICS-GRADE-FILTER-COMPACT-CHEVRON-V1`

No pick-A/B. This is the locked compact + dark-chevron unify applied to the control we broke.

---

## Related locks (read before APPLY)

- `docs/MOB-APPLIED-SETTINGS-UI-THEME-UNIFY-V1-20260723.md` — no full-width pills/bars  
- `docs/MOB-DISC-EVIDENCE-DETAIL-COMPACT-ACTIONS.md` — content-sized, not full-row  
- `docs/MOB-DISC-UI-DARK-FORM-CONTROLS-UNIFY-V1-APPLIED.md` — dark select + SVG chevron  
- `.cursor/rules/me8-enterprise-form-grid.mdc` — max-width caps on fields  
- `public/index.html` comment: *Content-sized actions — not full-row blue bars*

---

## Memory line (for future agents)

**Under `.enterprise-scope`, raw `select` stretches full width and loses the unify chevron unless you explicitly compact it and keep `background-image`. Toolbar filters must match enroll: ~180px + caret — never another east–west “tab” bar.**
