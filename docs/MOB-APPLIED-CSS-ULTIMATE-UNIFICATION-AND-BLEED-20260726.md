# MOB-APPLIED — CSS-ULTIMATE-UNIFICATION-AND-BLEED

**Date:** 2026-07-26  
**APPLY:** `CSS-ULTIMATE-UNIFICATION-AND-BLEED`  
**Primary file:** `public/css/settings-theme-unify.css`  
**Cache:** `?v=20260726-css-ultimate-unification-bleed-v1`

## Exact CSS diff

### 1) Kill right-side width limits (full bleed)

```diff
-#server-setup-panel .ss-config-content,
-#server-setup-panel #ss-panel-scroll {
-    max-width: 1000px;
-    width: 100%;
-}
+#server-setup-panel .ss-config-content,
+#server-setup-panel #ss-panel-scroll,
+#server-setup-panel .ss-config-body {
+    max-width: none !important;
+    width: 100% !important;
+    flex: 1 1 auto;
+    min-width: 0;
+}
```

Index mirror: `.ss-config-content { max-width: none; width: 100%; }` (1000px removed).

### 2) Scrollbar annihilation (exact + table wraps)

```css
/* KILL ALL INNER SCROLLBARS PERMANENTLY */
.ss-panel-scroll,
#server-setup-panel,
#server-config-workspace,
[id^="ss-section-"] {
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    overflow-y: visible !important;
    overflow-x: visible !important;
}
```

Also released: `.ss-config-content`, `.ss-config-body`, `.ss-bwc-table-wrap`, `.ss-users-table-wrap`.  
Native host: `#app-view-server:has(#server-config-workspace:not([hidden])) { overflow: auto !important; }`.

### 3) Left sidebar typography = primary app buttons

```diff
 #server-setup-panel .ss-config-nav button {
-    font-size: 11px;
-    padding: 9px 10px;
-    width: auto;
+    display: inline-flex;
+    align-items: center;
+    justify-content: flex-start;
+    gap: 6px;
+    width: 100%;
+    min-height: 32px;
+    padding: 7px 14px;
+    font-family: var(--font-ui), inherit;
+    font-size: 12px;
+    font-weight: 600;
+    line-height: 1.25;
+    border-radius: var(--radius-sm, 6px);
 }
 #server-setup-panel .ss-config-nav button.active {
     background: var(--accent-blue);
     color: #fff;
+    border-radius: var(--radius-sm, 6px);
+    box-shadow: none;
 }
```

Matches `.btn.btn-action` (12px / 600 / 7px 14px / radius-sm).

## Operator check

Ctrl+F5 → Settings → Server Config → Dashboard Auth  
PASS: content to right edge; no middle scrollbar (page/host scrolls); left nav matches app button look.
