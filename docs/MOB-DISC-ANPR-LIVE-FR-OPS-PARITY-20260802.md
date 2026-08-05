# MOB-DISC — ANPR live alert = FR ops pipeline (2026-08-02)

## FR live hit workflow (reference)

1. **Server** `lib/frLivePoller.emitHit` → socket **`fr-blacklist-hit`** via `emitToDashboardSockets`
2. **Client** `public/js/fr-alarm.js` `onHit` → `showHit`:
   - HQ bar + red toast + Ack/Dismiss
   - **`goOpsOnHit`** → Ops tab + map pin focus
   - **`VideoWall.promoteFrBlacklistLive`** → BWC wall/map PiP (live only)
3. **Offline FR** `source: 'offline-video'` → HQ/toast only; **`goOpsOnHit` returns early** unless explicit “Go to map”
4. **Keep** is on snap lightbox (`keepEvidencePack`), not the Ack strip

No Redux. Socket + DOM modules only.

## ANPR parity (APPLY)

- Live socket **`anpr-list-hit`** → existing hit bar/toast/rail + **`promoteLiveAnprHit`** → **`FrAlarm.goOpsOnHit`** (adapted payload, `source: 'live'`)
- Offline Match ticks `source: 'offline'` → rail + blacklist hit slots only; **no** `goOpsOnHit`
- Evidence modal: magnifier + **Download Evidence** (ANPR lightbox)
- Live triage: Ack / Dismiss / Keep (Keep opens evidence modal)

## UI (stapled)

Offline Match: tight left column (no `justify-between`), video `max-h: 45vh`, blacklist `min-h: 25vh` `flex-1`, Recent Plates 2-col + “Waiting for plates…” fallback.
