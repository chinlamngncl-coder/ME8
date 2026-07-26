# MOB DISC — Settings unified design (baseline truth) vs SaaS UI mess

**Date:** 2026-07-26  
**Status:** **LOCKED** — agent failed by inventing containment on inner grids  
**APPLY that follows:** `CSS-FULL-RESET-AND-SAFE-WRAP`

---

## What “unified” actually was (from Settings theme + Grid V4)

Source of truth files (not freestyle):

| File | Role |
|------|------|
| `public/css/settings-theme-unify.css` | Dark enterprise tokens under `#server-setup-panel` |
| Grid V4 rules in same file | `.ss-east-west-grid` = `repeat(auto-fit, minmax(350px, 1fr))`; **fields** `max-width: 420px` |
| Inline `#server-setup-panel` shell in `index.html` | Flex column: head + `.ss-config-body` + `.server-setup-actions` |
| Scroll | **Only** `.ss-panel-scroll { overflow-y: auto }` — footer **outside** scroll |

### DOM (Server Config) — do not invent

```text
#server-config-workspace
  └── #server-setup-panel          ← whole config chrome
        ├── .ss-setup-head
        ├── .ss-config-body        ← LEFT + RIGHT together
        │     ├── .ss-config-nav   (left sidebar)
        │     └── .ss-config-content
        │           └── #ss-panel-scroll
        └── .server-setup-actions  (Save / Back — footer)
```

### Locked product look (pre-SaaS Step 2 UI)

- Dark navy cards / borders (`#0f172a`, `#334155`)
- East-west **multi-column** forms when width allows
- Inputs capped at **420px** (not the whole grid)
- Left rail ~212px; buttons fill **rail**, not full viewport
- Save bar **flex-shrink: 0** under content — never overlapping Site Resilience

### What agents broke (forbidden)

| Mistake | Why it killed the layout |
|---------|---------------------------|
| `max-width` on `.ss-east-west-grid` / inner panels | Forced single-column “vertical slabs” |
| `height: auto` + `overflow: visible` on panel/scroll | Destroyed flex; broke footer anchor; fake middle scrollbar |
| `margin: 0 auto` on wrong nodes | Left dead space / floated footer |

**Rule locked:** Containment = **one outer wrapper**. Never restyle the east-west grid to “fix” ultrawide.

---

## Safe wrap (only this)

Highest wrapper that holds **both** sidebar and main content (and for a clean whole-view center, the panel that also holds head + footer):

**`#server-setup-panel`**

```css
#server-setup-panel {
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}
```

Do **not** change its `height` / `overflow` / flex children.  
Do **not** add SSL-specific layout CSS — SSL HTML inherits existing section + label styles.

---

## Apology / ownership

Operator was right. Guessing CSS instead of restoring the unified shell was a hard fail. Reset first; one outer wrap only; SSL HTML only after layout is back.
