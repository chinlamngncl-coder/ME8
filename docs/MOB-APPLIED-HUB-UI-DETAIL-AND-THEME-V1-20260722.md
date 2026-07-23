# MOB-APPLIED — HUB-UI-DETAIL-AND-THEME-V1

**Date:** 2026-07-22  
**APPLY:** `MOB-APPLY HUB-UI-DETAIL-AND-THEME-V1`  
**Disc:** `MOB-DISC-SEVEN-ISSUES-HUB-CHIN-LOCK-GPS-REMOTES-20260722.md` (§2–3)

## Scope (this MOB only)

1. Redacted exports **Detail** column shows full **Download · Open source** (not Delete; not clipped to “Do…”).
2. Hub theme: primary actions **content-sized** — stop full-row blue pipes on **Load trace** / matching hub buttons.

## Changes

| File | Change |
|------|--------|
| `public/index.html` | `#ev-rx-table-wrap`: `overflow-x: auto` (was `hidden`); Detail col `min-width: 168px`; table `min-width: 720px`; file/source cols slightly tighter |
| `public/index.html` | `.rt-toolbar .btn` + `#ax-fr-verify-btn` / verify row: `width: auto !important` |
| `public/index.html` | Redacted exports toolbar buttons: explicit content-sized |
| Cache | `evidence-hub.js?v=20260722-hub-ui-detail-theme-v1` |

**Not changed:** Delete on Case Files; Chin video; lock GPS; Centre Summary; FR logic; remotes.

## Operator verify

1. Restart not required for CSS — **Ctrl+F5** once  
2. Evidence → **Redacted exports** → right column shows full **Download · Open source** (readable + clickable)  
3. Evidence → **Route trace** → **Load trace** is a **small** blue button (not a full-width blue bar)  
4. Analytics → Verify → **Run verify** stays content-sized (not a pipe)

**PASS / FAIL:** _(operator)_
