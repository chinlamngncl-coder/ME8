# MOB APPLIED — UI-COPY-SHORT-NO-TEACH-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY UI-COPY-SHORT-NO-TEACH-V1`  
**Disc:** `docs/MOB-DISC-UI-COPY-SHORT-NO-TEACH-20260723.md`

## What changed

Ops console copy — **titles/buttons**, not tutorials. Manual later.

### Wave 1 (this MOB)

| Area | Change |
|------|--------|
| **PTT Groups / Call Groups** | Teaching paragraphs removed (`hidden` + empty i18n) |
| Members / field how-to lines | Hidden |
| Status / pick lines | Short (`{n} selected`, `Need 2+`, `HQ + {n}`) |
| Messages / Storage / SOS ledger | Short or hidden retention essay |
| Geofence dialogs / draw / SOS banner essays | Hidden or shortened |
| Map popout / stack HUD | Short (`Display only`, `Stacked`) |

**Files:** `public/locales/*.json`, `public/index.html`  
**Cache:** `i18n.js?v=20260723-ui-copy-short-no-teach-v1`

### Not in this MOB (later)

**Server Config** long `setup-hint` blocks → optional `UI-COPY-SHORT-SERVER-CONFIG-V1`

## Operator verify

1. Ctrl+F5  
2. Left panel: **PTT Groups** / **Call Groups** = title + controls only (no how-to paragraph)  
3. Messages / SOS look short  

**PASS** = console, not textbook. **FAIL** = say which box still teaches.
