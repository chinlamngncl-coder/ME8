# MOB — `mob-fr-grab-warm-gate` (CHECKPOINT FAIL fix)

**Status:** APPLIED 2026-07-13  
**Trigger:** CHECKPOINT FAIL — unstable, does not snapshot. Logs: `Could not open encoder before EOF` / `fr grab: no stream data`.

## Cause

`mob-fr-capture-grab-tune` started the **1s grab clock on WS open**. UI could show video while the FR tap still had late/empty bytes → ffmpeg stdin closed before a full frame → encoder EOF → no rail snaps.

## Fix (`lib/frLiveProbe.js`)

1. Wait for **first WS message**, then start `GRAB_MS` collect window  
2. Defaults: `GRAB_MS=1800`, `NO_DATA_MS=1500`, `EOF_MS=400` (still overridable via env)

## Verify

1. `RESTART-FLEET.bat` (loads new grab code)  
2. Hard refresh → Analytics FR → live Chin  
3. Wait ~5–10s facing camera → Snapshot rail should fill  
4. Mini checkpoint: one cam live → stop → Open All lite → stop all  
