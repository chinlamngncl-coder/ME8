# MOB APPLIED — FR-BLACKLIST-SCORE-UPGRADE-DISPATCH-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY FR-BLACKLIST-SCORE-UPGRADE-DISPATCH-V1`  
**Disc:** `MOB-DISC-FR-BLACKLIST-SCORE-UPGRADE-DISPATCH-20260723.md`  
**Prior:** auto dispatch @ 75% on first emit; upgrade case was blocked by ~45s dedupe

## What changed

| Layer | Change |
|-------|--------|
| `lib/frLivePoller.js` | Track `lastHitScoreByKey`; during dedupe window, **re-emit** if prior score **&lt; 75** and new score **≥ 75** (`scoreUpgrade: true`) |
| `public/js/fr-alarm.js` | If bar already open for same cam/person and upgrade arrives → refresh bar + **goOps** (do not park in queue) |

Floor = `FM_FR_MAP_AUTO_SCORE_MIN` / `FM_FR_MATCH_MIN` / default **75**.

**Cache:** `fr-alarm.js?v=20260723-fr-blacklist-score-upgrade-dispatch-v1`  
**Restart Fleet** required (poller is server-side).

**Operator:** **PASS** 2026-07-23 — weak hit stays; later ≥75% auto Ops + pin.

## Next

`MOB-APPLY REDACT-HOLD-SMOOTH-V1` or Stage B `mob-sec-evidence-upload-safe-name`.
