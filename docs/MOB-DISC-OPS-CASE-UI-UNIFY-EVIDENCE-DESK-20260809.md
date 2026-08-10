# MOB DISC — Ops Cases UI must unify with Evidence desk (2026-08-09)

**Status:** LOCKED design intent. Code polish = later APPLY if layout/scroll drifts.  
**You asked:** Will Cases scroll when many rows? Will UI match our usual pages — or another lousy one-off?

---

## Honest status (now)

Cases desk **reused** Evidence patterns in markup:

- Same hub nav / panel shell as Case Files  
- Same filter toolbar class family (`cf-filter-toolbar`)  
- Same `evidence-table` list  
- Detail in `enterprise-card`  

It is **meant** to look like **Evidence → Case Files**, not a new product skin.

What was **not** guaranteed in the wire/copy APPLYs: full scroll/height parity CSS that Case Files already has (list scrolls inside the panel; page does not turn into a random scrolling mess). That polish was not a named APPLY. If Cases feels “off” vs Case Files — treat as **unify debt**, not a new design language.

---

## Locked design (same as always)

| Rule | Meaning |
|------|---------|
| **One Evidence desk language** | Cases uses the same chrome as Case Files / Library: filters, table, detail card, buttons (`btn-primary` / `btn-ghost` / toolbar) |
| **`global.css` + existing Evidence classes** | No new page CSS file; no inline style dump; no “special Cases theme” |
| **Enterprise form/grid rules** | Filters stay east–west wrap; inputs capped; label above field |
| **No uni-project chrome** | No toast/filing-cabinet voice (already death-penalty disc) |
| **Status words** | Ack only / Has notes / Amended / Reviewed — human badges only |

Forbidden: freestyle cards, purple glow, random floating panels, toast-office History UI, a different table skin than Evidence.

---

## Scrolling (locked intent)

When many cases:

| Area | Behavior |
|------|----------|
| **List** | Table body / table wrap **scrolls inside** the Evidence Cases panel |
| **Ops / whole dashboard** | Must **not** grow a second page scrollbar that fights the locked live/map no-scroll rules |
| **Detail** | Notes + touch log scroll inside the detail card if long — not a new full-page layout |

Same idea as Case Files list: **panel-local scroll**, not “lousy full window dump.”

**APPLY:** `OPS-CASE-UI-SCROLL-UNIFY-V1` ✅ (2026-08-09)

- Mirror Case Files panel height/scroll onto `#ev-panel-ops-cases`  
- **Empty / ≤12 rows:** compact, **no list scrollbar**  
- **Many rows (fills panel):** table wrap scrolls inside panel only  

