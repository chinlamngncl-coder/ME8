# MOB-APPLIED — Skip group refresh during PTT hold

**Date:** 2026-07-20  
**MOB:** `MOB-APPLY-PTT-HOLD-SKIP-GROUP-REFRESH-DURING-TALK-V1`  
**DISC:** `docs/MOB-DISC-GROUP-PTT-TX-PROOF-RESULT-20260720.md`

---

## Problem

TX proof showed Fleet writes group PTT to both cams correctly, but Chin `:29201` still drops/reconnects during SOS+live. Likely cause: `schedulePttGroupRefreshForCam` (handoff 2s/8s refresh) firing **while operator is holding PTT**, knocking TCP mid-talk.

---

## Change

| File | Change |
|------|--------|
| `server.js` | `isCamIdInActivePttTalk(camId)` — true when cam is in any active `pttTalkTargetsBySocket` hold |
| `server.js` | `schedulePttGroupRefreshForCam` — skip schedule + skip timer fire while cam in active talk |

**Not touched:** `pushPttGroupForCamera` direct paths (SOS team button, wake, always-on). Only **scheduled** handoff refresh is gated.

---

## Log markers

```
group refresh skipped during talk | path:ptt-hold-skip-group-refresh-during-talk-v1
```

Expect during hold: **no** `group refresh scheduled` for that cam until `operator talk stop`.

---

## Operator test

1. **Restart ME8**
2. SOS → PTT team → hold group PTT **5+ seconds** while live open on alarm cam
3. Check `storage/fleet.log`:
   - `group ptt tx proof` both cams `ok:true`
   - `group refresh skipped during talk` (if handoff would have fired)
   - **no** `client disconnected` for Chin mid-hold
4. Ear: less choppy; Chin should stay on same `:29201` peer through hold

| Pass | Fail |
|------|------|
| No TCP drop mid-hold | Still `client disconnected` during hold |
| Skipped refresh log during talk | `group refresh scheduled` fires mid-hold |
| Smoother ear | Still choppy — next: SOS team XML vs classic |

---

## One line

Do not re-push PTT group config from live handoff timers while operator is actively holding talk on that cam.
