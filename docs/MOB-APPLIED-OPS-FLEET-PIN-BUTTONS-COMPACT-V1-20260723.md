# MOB APPLIED — OPS-FLEET-PIN-BUTTONS-COMPACT-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY OPS-FLEET-PIN-BUTTONS-COMPACT-V1`  
**Disc:** `MOB-DISC-OPS-FLEET-PIN-BUTTONS-FAT-NOT-HTTPS-20260723.md`

## What this fixes

Ops sidebar **Open All (Up to 8)** and **Clear map pins** were fat because global `.btn.btn-action` / `.btn.btn-ghost` (CSS rollout) overrode the small fleet styles.

## Change (only these two)

In `public/css/global.css`: id-level rules for `#fleet-open-all-pins` and `#fleet-clear-pins` — compact padding `4px 8px`, `font-size: 10px`, `min-height: 0`.

Cache: `global.css?v=20260723-ops-fleet-pin-buttons-compact-v1`

## Outside this MOB

No other Ops chrome. No HTTPS/WSS. No login redesign.

## Operator verify

1. Hard refresh Ops (`Ctrl+F5`).  
2. **PASS:** Open All + Clear map pins look small again (not thick blue slabs).  
3. Buttons still work.
