# MOB-APPLIED — CSS-SURGICAL-CONTENT-LIMIT

**Date:** 2026-07-26  
**APPLY:** `CSS-SURGICAL-CONTENT-LIMIT`  
**Cache:** `settings-theme-unify.css?v=20260726-css-surgical-content-limit-v1`

## Exact CSS diff (what changed)

### 1) Master wrappers — centering REMOVED

**`#server-setup-panel` (index.html + unify.css)**

```diff
 #server-setup-panel {
-    max-width: 1400px;
-    margin: 0 auto;
+    max-width: none;
+    margin: 0;
     /* height / overflow flex shell unchanged — left rail stays edge-anchored */
 }
 #server-setup-panel.ss-layout-wide,
 #server-setup-panel.ss-layout-admin {
-    max-width: 1400px;
+    max-width: none;
 }
```

`#server-config-workspace` — unchanged (no `max-width` / no `margin: 0 auto`).

### 2) Surgical width — RIGHT CONTENT ONLY

Target: `.ss-config-content` (+ `#ss-panel-scroll` for the form scroll pane).  
**Not** `#server-setup-panel`, **not** `.ss-config-nav`, **not** `.ss-config-body`.

```diff
 .ss-config-content {
     flex: 1 1 auto; min-width: 0; min-height: 0; display: flex; flex-direction: column;
+    max-width: 1000px; width: 100%;
 }
+#ss-panel-scroll.ss-panel-scroll {
+    max-width: 1000px;
+}
```

Unify mirror:

```css
#server-setup-panel .ss-config-content,
#server-setup-panel #ss-panel-scroll {
    max-width: 1000px;
    width: 100%;
}
```

No `margin: 0 auto` on these — forms stay left-aligned next to the sidebar.

### 3) Tab / pill backgrounds hug text

```diff
 .ss-config-nav button,
 #server-setup-panel .ss-config-nav button {
-    display: block; width: 100%;
+    display: inline-flex; align-items: center; width: auto; max-width: 100%;
+    align-self: flex-start;
 }
 .ss-network-section-nav button,
 .ss-protocol-tabs button {
+    display: inline-flex; align-items: center; width: auto;
 }
```

### 4) Scroll / height

- Did **not** strip the shell flex clip (`#server-setup-panel { overflow: hidden; height: 100% }` + `.ss-panel-scroll { overflow-y: auto }`) — that is the natural single scroll, not an artificial mid-panel lock.
- No new `height: auto !important` / `overflow: visible` on inner grids.
- East-west grid left at `max-width: none` (fields still 420px).

## Operator check

Ctrl+F5 → Settings → Server Config  
PASS: left nav flush left; forms capped ~1000px on the right; tab/pill backgrounds hug labels; one natural content scroll.
