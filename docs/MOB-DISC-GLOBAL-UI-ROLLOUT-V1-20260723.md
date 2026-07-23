# MOB DISC — GLOBAL-UI-ROLLOUT-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-EXECUTE-GLOBAL-UI-ROLLOUT-V1` (EXECUTE = APPLY)  
**Status:** APPLIED — `docs/MOB-APPLIED-GLOBAL-UI-ROLLOUT-V1-20260723.md`  
**Depends on:** END-TO-END-UI-CONSOLIDATION-V1 PASS (Analytics FR + Storage)

## Scope (agent pick — risk)

Roll design system to **remaining primary HTML shells** and retrofit **other dashboard views inside `index.html`** (Settings, VC, Command Wall, Centre Summary, Evidence non-storage panels) with enterprise classes.

**Will NOT:** delete the entire `index.html` `<style>` block (map / SOS / wall / pin chrome would die). Strip only **duplicate card/button/layout** chrome that `global.css` already owns; keep behavior CSS (drawers, map, SOS, wall banks).

**Will NOT:** touch `server.js`, SIP/PTT/WebRTC, `video-wall.js`, Leaflet JS, IDs/`data-*`, API routes.
