# MOB DISC — Prior exports Trim/Redact row: why split so wide (broke unified UI)

**Date:** 2026-07-23  
**Status:** APPLIED 2026-07-23 — `MOB-APPLY PRIOR-EXPORTS-ROW-COMPACT-UNIFY-V1`  
**See:** `docs/MOB-APPLIED-PRIOR-EXPORTS-ROW-COMPACT-UNIFY-V1-20260723.md`  
**Operator:** Trim copies PASS for Remove/Clear, but layout is **split wide** / huge gap between meta and Download·Remove — “didn’t you get the UI unified rules? why invent again?”  
**Screenshot:** `[Trim]` rows · buttons far below the filename · empty dark band in between.

---

## Apology

You are right. This was **invented layout**, not the locked Evidence compact rule.  
Function (label + Remove) was in scope; **stacking the row into a tall two-deck** was not required and violated existing UI discs.

---

## Locked rules I should have followed (already in repo)

| Disc / APPLY | Rule |
|--------------|------|
| `MOB-DISC-EVIDENCE-DETAIL-COMPACT-ACTIONS` | Content-sized chips — **not** full-row bars; `width: auto` |
| `MOB-DISC-REDACTED-EXPORTS-DETAIL-ACTIONS-UGLY` | Actions **inline** side-by-side — **not** stacked `width:100%` boxes |
| `MOB-DISC-REDACT-NO-DOWNLOAD…` (Prior) | **Meta left / actions right** — tidy one row |

**Unify target (no inventing):** one compact Prior row ≈ one line of meta + small Download / Remove chips on the **right** (wrap only if the pane is truly narrow).

---

## Why it looks “split so wide” (exact cause)

Agent-added CSS in `PRIOR-FINALIZED-SUPERADMIN-ACTIONS-V1` / `PRIOR-TRIM-LABEL-AND-REMOVE-V1`:

```css
.ev-export-row-redact,
.ev-export-row-trim { flex-direction: column; align-items: stretch; }

.ev-export-actions-col {
  flex: 1 1 100%;   /* forces actions onto their own full-width row */
  …
}
```

Plus the **global** Fleet rule still applies unless overridden:

```css
.btn { width: 100%; }
```

So each Prior row becomes:

```
┌ meta (filename · size · Created · EXP-…) ─────────────┐
│                                                       │  ← empty band (column stretch)
│ ┌─────────────── Download (100% width box) ─────────┐ │
│ └───────────────────────────────────────────────────┘ │
│ ┌─────────────── Remove   (100% width box) ─────────┐ │
│ └───────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

That empty band + full-width ghost buttons = “split so wide.”  
**Not** a product need — a bad flex choice to “make sure buttons aren’t clipped.”

---

## What to do (one path)

`MOB-APPLY PRIOR-EXPORTS-ROW-COMPACT-UNIFY-V1`

| Change | Detail |
|--------|--------|
| Kill | `flex-direction: column` on `.ev-export-row-redact` / `.ev-export-row-trim` |
| Restore | Row = `flex` wrap · **meta left · actions right** (`actions-col`: `flex: 0 0 auto`, not `1 1 100%`) |
| Compact buttons | Under `#ev-panel-detail .ev-export-actions-col .btn` (and links): `width: auto; flex: 0 0 auto; white-space: nowrap` — same as Analytics / Evidence compact rule |
| Keep | `[Trim]` / `[Redacted]` labels, Created vs Burned, Remove / Clear / Second pass **behaviour** — only layout |
| Do not | Invent a new card design, new fonts, or stacked “tower” Detail again |

**Risk:** Narrow pane may wrap actions under meta (tight gap, not a huge empty column). That is OK and matches wrap-friendly compact UIs elsewhere.

---

## One line

**Wide split = agent forced column + 100% buttons against locked meta-left/actions-right compact rules; next APPLY restores one tidy Prior row.**
