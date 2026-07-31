# MOB-DISC — ANPR-SUBNAV-STAY-ON-ANPR-V1 APPLIED (2026-07-31)

## MOB
`ANPR-SUBNAV-STAY-ON-ANPR-V1`

## Bug
ANPR **Snapshot** / **Plate lists** sub-nav reused class `ax-hub-nav-btn`. Hub binder bound all `.ax-hub-nav-btn` and called `showPanel(data-panel)`. Sub-nav buttons have no `data-panel` → defaulted to **Face**.

## Fix
1. Sub-nav buttons use own class `ax-anpr-subnav-btn` (not `ax-hub-nav-btn`).
2. Hub binder + active-state: only `.ax-hub-nav > .ax-hub-nav-btn[data-panel]`.
3. ANPR sub binder: `.ax-anpr-subnav .ax-anpr-subnav-btn` → `showAnprSub` only.
4. Cache: `analytics-hub.js?v=20260731-anpr-subnav-stay-v1`

## Operator check
1. Hard refresh Analytics.
2. Open **ANPR**.
3. Click **Snapshot** then **Plate lists**.
4. Must stay on ANPR (not jump to Face).
