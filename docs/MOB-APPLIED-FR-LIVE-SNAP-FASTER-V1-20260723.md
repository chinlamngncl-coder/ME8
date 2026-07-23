# MOB APPLIED — FR-LIVE-SNAP-FASTER-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY FR-LIVE-SNAP-FASTER-V1`  
**Disc:** `docs/MOB-DISC-FR-LIVE-SNAP-FASTER-20260723.md`  
**Prior PASS:** `FR-LIVE-GRAB-ZLM-HANDOFF-V1`

## What changed

WVP handoff stays **ON**. Recent still path is tightened (no mpeg1 pool).

| Knob | Before | After |
|------|--------|-------|
| `FM_FR_FLV_GRAB_MS` default | 2500 | **1200** |
| `FM_FR_POLL_SEC` floor / default | floor 2 / default 2 | floor **1** / default **1** |
| Grabs under handoff | same as classic (2) | **1** (`FM_FR_HANDOFF_BEST_FRAME_GRABS`, default 1) |
| Classic (handoff off) grabs | 2 | unchanged (`FM_FR_BEST_FRAME_GRABS`) |
| Media log | — | `fr flv grab ms` `{ camId, ms, bytes, budgetMs }` |

**Files:** `lib/frLiveProbe.js`, `lib/frLivePoller.js`

**Operator:** **PASS** 2026-07-23 — Recent feels faster. Follow-up disc: jump-to-map + grade → `MOB-DISC-FR-HIT-JUMP-MAP-AND-DS-GRADE-20260723.md`.
