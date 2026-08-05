# MOB-DISC — ANPR Zero-Latency Drop + Track Flush V1

**Date:** 2026-08-02  
**APPLY:** `ANPR-ZERO-LATENCY-DROP-TRACK-FLUSH-V1`  
**Scope:** Backend only (Node tracker + live poller + Python dual temporal). **No HTML/CSS.**

## Problem

~40s “processing lag” felt on live ANPR was **not** a growing Python frame queue. Drop-oldest `maxsize=1` already existed. Lag came from:

1. Track hold default **4.5s** before OCR harvest  
2. Up to **3** sequential dual-OCR macros after exit  
3. Emit gate requiring full temporal N lock  

## Locked fixes

| # | Change | File |
|---|--------|------|
| 1 | Confirm LIFO / drop-oldest `maxsize=1` (no backlog) | `anpr-sidecar/drop_oldest_queue.py` |
| 2 | Track unseen → force-flush default **1.0s** (`FM_ANPR_TRACK_MAX_AGE_MS=1000`) | `lib/anprTrackBestFrame.js` |
| 3 | Force-flush temporal: lock **best available** plate even if votes &lt; N | `anpr-sidecar/dual_lpr.py` |
| 4 | Harvest OCR default **1** top macro; emit on force-flush best string | `lib/anprLivePoller.js` |

## Env / hatch

| Var | Default | Meaning |
|-----|---------|---------|
| `FM_ANPR_TRACK_MAX_AGE_MS` | `1000` | Track gone flush (hatch `4500`) |
| `FM_ANPR_TEMPORAL_FORCE_FLUSH` | `1` | Lock best string when votes &lt; N (hatch `0`) |
| `FM_ANPR_FLUSH_MACROS` | `1` | Macros to OCR on flush (hatch `3`) |
| `FM_ANPR_FORCE_FLUSH_EMIT` | `1` | Emit without strict temporal N (hatch `0`) |

## Untouched (death-sentence)

- Dual engines A/B, cascade crop, DeviceControl, video wall, HTML/CSS  
- Node drop-oldest frame queue behavior (already maxsize=1)

## Operator

1. Restart **START-ANPR.bat** (loads `dual_lpr` force-flush).  
2. Restart ME8 (loads tracker + poller).  
3. Drive a plate past live cam — expect emit ~**1s after vehicle leaves view** + one OCR, not 4.5s + triple OCR.  
4. PASS/FAIL from what you see on the rail.

## Risk

Faster flush + weaker temporal gate → more wrong plates possible. Restore hatch envs above if quality regresses.
