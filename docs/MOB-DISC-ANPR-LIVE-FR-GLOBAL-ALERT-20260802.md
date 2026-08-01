# MOB-DISC — ANPR live → FR global alert pipeline (LOCKED 2026-08-02)

## [1] FR Live Hit dispatch (inquiry answer)

**No Redux.** Live FR matches dispatch via Socket.IO only.

| Step | Detail |
|------|--------|
| Server event | `fr-blacklist-hit` from `lib/frLivePoller.emitHit` → `emitToDashboardSockets` |
| Client listener | `public/js/fr-alarm.js` `sock.on('fr-blacklist-hit', onHit)` |
| UI entry | `onHit` → `showHit` |
| Surfaces | HQ global bar + red toast + alert drawer · **Ack / Dismiss / Keep for Investigation** |
| Map + BWC PiP | `goOpsOnHit` → Ops map pin · `VideoWall.promoteFrBlacklistLive` |
| Offline FR | `source: 'offline-video'` or `isLive: false` → toast/HQ only; no auto map/PiP |

## ANPR binding

- Live Stage-3 list match (`lib/anprLivePoller.publishTick`) emits `anpr-list-hit` with **`isLive: true`**, `kind: 'anpr'`.
- Client `AnprLiveWatch.onListHit` → `FrAlarm.onHit(adaptedPayload)` — **same triage pipeline as FR**.
- Offline Match stays `source: 'offline'` / never sets live dispatch; does **not** call `FrAlarm.onHit`.

APPLY name: `ANPR-LIVE-FR-GLOBAL-ALERT-V1`
