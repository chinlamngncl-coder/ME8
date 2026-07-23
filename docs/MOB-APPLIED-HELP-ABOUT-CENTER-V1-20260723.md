# MOB-APPLIED — HELP-ABOUT-CENTER-V1

**Date:** 2026-07-23  
**APPLY:** `MOB-APPLY HELP-ABOUT-CENTER-V1`  
**Disc:** `docs/MOB-DISC-HELP-ABOUT-CENTER-20260723.md`  
**Scope:** Settings Help & About hub (frontend). No license move. No map/video-wall edits. `/legal-notices.html` kept.

## What landed

1. Settings account card: **Help & About** button (replaces dim Legal Notices-only link).
2. In-product panel `#server-help-about-workspace` — Back to Settings; product **Mobility Axiom**; build from `/api/health` `buildId`.
3. Sections: Help pointers, Support, Legal → link to **`/legal-notices.html`**, note that license stays in Settings ops.
4. Opening Server Config closes Help; opening Help closes Config.

## Files

| File | Change |
|------|--------|
| `public/index.html` | Entry + panel CSS/markup + script tags |
| `public/js/help-about.js` | **New** open/close + version load |
| `public/js/server-setup.js` | Hide Help when Config opens |
| `public/locales/en.json` | `server.helpAbout*` keys |
| cache | `help-about.js` / `server-setup.js` `?v=20260723-help-about-center-v1` |

## Operator verify

1. **Ctrl+F5** → Settings  
2. Lower account card shows **Help & About** (not “About Us”)  
3. Open → Back returns to Settings hub  
4. **Legal Notices** opens `/legal-notices.html`  
5. License chip / Server Config license path unchanged  

**PASS / FAIL:** _(operator)_
