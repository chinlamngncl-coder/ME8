# MOB-APPLIED — REVERT-AND-FIX-GRID-DISASTER

**Date:** 2026-07-26  
**APPLY:** `MOB-APPLY REVERT-AND-FIX-GRID-DISASTER`  
**Cause:** DYNAMIC-FRONTEND / CSS-CONTAINMENT-HOTFIX put `max-width` / `overflow: visible` / `height: auto` on the **internal** panel + grids → stacked columns + Save buttons overlapping Site Resilience.

## Exact CSS intent

### 1) Outer center only (safe)

```css
#server-config-workspace {
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  overflow: hidden; /* flex shell */
}
```

### 2) Restore panel shell (footer below content)

```css
#server-setup-panel {
  width: 100%;
  max-width: none;   /* NOT 1100 on the panel */
  height: 100%;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.ss-panel-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}
.server-setup-actions {
  flex-shrink: 0;
  border-top: 1px solid …;
  z-index: 2;
}
```

### 3) Do NOT touch `.ss-east-west-grid`

Left V4 rules alone (`repeat(auto-fit, minmax(350px, 1fr))`, field `max-width: 420px`).  
Removed the bad override that capped grids at 1100px.

### 4) SSL kept

`#ss-section-ssl .ss-ssl-form { max-width: 420px; }` only — no grid blow-out.

## Cache

`settings-theme-unify.css?v=20260726-revert-fix-grid-disaster-v1`

## Smoke

1. Ctrl+F5 → Server Config  
2. East-west fields sit side-by-side again (not giant vertical slabs)  
3. **Save changes** sits in the footer under the scroll area — not over Site Resilience  
4. Page floats centered (~1400) on dark background  

Reply **PASS** / **FAIL**.
