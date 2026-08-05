# MOB-DISC — ANPR Offline: hide subnav Watchlist badge V1

**Date:** 2026-08-02  
**APPLY:** `ANPR-OFFLINE-HIDE-SUBNAV-WATCH-BADGE-V1`  
**Scope:** Offline ≠ Live. No Python. No FrAlarm invent.

## Locked

| Tab | `#ax-anpr-subnav-watch-badge` |
|-----|-------------------------------|
| **Live** | Shown — count = Live critical alerts only |
| **Offline Match** | **Hidden** — hits only in **BLACKLIST / SUSPECT HITS** |
| Snapshot / History / Lists | Hidden |

## Applied

1. Badge `hidden` by default in `index.html`.
2. `paintSubnavWatchBadge` — hide unless Live panel visible; never add Offline `hitRail` to the count.
3. `showAnprSub` calls `AnprLiveWatch.syncSubnavWatchBadge()` on every sub-tab switch.
4. Cache: `?v=20260802-offline-hide-subnav-watch-badge-v1`

## Operator

Hard refresh → Analytics → ANPR → **Offline Match** → top-right “Active Watchlist Hits” must be gone. Live tab still shows it.
