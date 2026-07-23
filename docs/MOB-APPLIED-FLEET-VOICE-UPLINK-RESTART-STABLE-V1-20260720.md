# MOB-APPLIED — Soft PTT uplink restart-stable V1

**APPLY:** `MOB-APPLY-FLEET-VOICE-UPLINK-RESTART-STABLE-V1`  
**Date:** 2026-07-20  
**DISC:** `docs/MOB-DISC-SOFT-PTT-ONESHOT-KK-BWC-BUTTON-20260720.md` (option **A**)

---

## Boundaries held

- Cold SOS / event bus — untouched  
- Live ZLM / lobotomy — untouched  
- No UI button surgery  
- Soft PTT/Call still Fleet sockets → VoiceAdapter only  

---

## What landed

Rapid soft PTT was doing full `broadcast/stop` + FFmpeg kill then immediate restart (~1s). HTTP/uplink looked OK; cam ear often died after first press.

| Change | Behavior |
|--------|----------|
| Soft `stopTalk` | Defers hard tear-down **2s** (`FM_WVP_VOICE_TEARDOWN_MS`) |
| Quick re-press | Cancels deferral, **reuses** live broadcast + uplink (`reused` in log) |
| Fresh start after hard stop | Waits up to **800ms** settle (`FM_WVP_VOICE_RESTART_SETTLE_MS`) |
| Uplink stop | End stdin → wait exit → then SIGTERM |
| Disconnect | **Immediate** hard stop (no grace) |

Files: `lib/wvpFleetVoiceAdapter.js`, `lib/wvpVoiceUplink.js`, `server.js` (disconnect), `.env` comments.

---

## Operator smoke

1. Hard refresh  
2. Cold SOS still OK  
3. Soft PTT Chin (or group during SOS): hold → release → **hold again within ~2s** — expect ear both times  
4. Log expect on 2nd press: `fleet voice adapter start` with **`reused:1`** (or more), not a full new broadcast storm  
5. After waiting **>2s**, next press may show `restart settle` then fresh start — ear should still work  

KK ear / BWC button = still later MOBs (B / C), not this APPLY.
