# MOB — WVP bundled ZLM stamp / keepalive tune

**Status:** APPLIED 2026-07-14 — **SOAK FAIL** (~2 min: A heavy lag, B stop/play)  
**See:** `docs/MOB-DISC-WVP-STAMP-TUNE-FAIL.md` — next = revert `modifyStamp` to 0  
**File:** `docker/wvp/zlm-bundled/config.ini` only (mounted into `me8-wvp`)  
**Not touched:** Fleet `me8-zlm`, wall, Open All, invented Google keys (`lowLatency` absent on this 2021 binary)

## Changes (from soak log: stamp spam + Tile B player drop/reopen)

| Key | Was | Now | Why |
|-----|-----|-----|-----|
| `modifyStamp` (general + rtmp) | 0 | **1** | Use relative/system stamp path — soak had constant stamp warnings |
| `streamNoneReaderDelayMS` | 18000 | **60000** | Brief player blink should not tear media as fast |
| `http` / `rtmp` / `rtsp` `keepAliveSecond` | 15 | **30** | Longer reader keepalive |
| `rtp_proxy.timeoutSec` | 15 | **30** | More RTP hiccup grace (BWC/cellular class) |
| `mergeWriteMS` | 0 | 0 | unchanged |
| `maxStreamWaitMS` | 15000 | 15000 | **not** slammed to 1000 |

Container recreated so ZLM reloads ini.

## You prove (one soak — PASS/FAIL from picture)

1. Cams back on WVP **5061** if they dropped during recreate  
2. Fleet dashboard → Lab two tiles → Play A + B  
3. Leave **> 30 min**  
4. **PASS** = both stay live without stop/come-back every few minutes  
5. **FAIL** = Tile B (or either) still dies/reopens often → next is player / concurrent path, not more ini spam

This PASS = **path quality** for any GB cam on this desk — **not** thousand-cam capacity.

Disc: `docs/MOB-DISC-WVP-PROPER-SCALE-NOT-TWO-CAMS.md`
