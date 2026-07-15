# MOB — one cam fast on test page — REVERTED

**Status:** **REVERTED** 2026-07-14 after **CHECKPOINT FAIL** (Chin + kk panel play dead)  
**MOB:** `mob-one-cam-fast-on-our-page`

## Cause

Pool FFmpeg was given a second output (push to ZLM). When that path failed or stalled, **wall play died** for both cams. Also test-zlm showed “No active pool stream.”

## Action

Reverted pool tee + related fast-lab skips. `FM_ZLM_FAST_LAB=0`.

Wall path back to pre-MOB behavior. Fast-like-WVP on our page = **not done** — needs a different design that does **not** touch pool FFmpeg.

## Operator

1. Confirm BWC SIP is **Fleet 5060** (not WVP 5061).  
2. `RESTART-FLEET.bat` → hard refresh → checkpoint again.
