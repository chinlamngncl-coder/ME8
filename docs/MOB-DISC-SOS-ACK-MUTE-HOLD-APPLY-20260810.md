# MOB DISC — APPLY SOS-ACK-MUTE-HOLD-V1 (60s) — 2026-08-10

**Status:** APPLIED.  
**APPLY:** `MOB-APPLY SOS-ACK-MUTE-HOLD-V1` + **60 seconds**  
**File:** `public/js/dashboard-boot.js` only  
**Not touched:** `video-wall.js` attach/FLV/pin, SIP, DeviceControl, stop-video, Path B Record.

---

## Change

| Before | After |
|--------|--------|
| Ack → `muteAckedCamLiveAudio` **now** | Ack → `scheduleMuteAckedCamLiveAudio` → mute after **`SOS_ACK_MUTE_HOLD_MS = 60000`** |
| — | New SOS on that cam → **cancel** pending mute hold + unmute as today |

Manual mute during hold: already muted when timer fires → mute is no-op.  
Manual unmute then wait past 60s: leftovers auto-mute once (by design).

---

## Operator PASS

1. Hard refresh Ops.  
2. SOS → hear live.  
3. Ack with note → **still hear** for ~60s.  
4. After ~60s → panel auto-mutes.  
5. Mid-hold: mute yourself → stays muted.  
6. New SOS before 60s ends → listen again (hold cancelled).

---

## Next (disc only — not this APPLY)

`SOS-STOP-VIDEO-STOP-RECORD-V1` — see  
`docs/MOB-DISC-SOS-STOP-VIDEO-STOP-RECORD-ONLY-20260810.md`
