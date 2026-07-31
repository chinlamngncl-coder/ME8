# MOB DISC — ANALYTICS-ENGINE-HEALTH-PILL-V1 APPLIED

**Date:** 2026-07-30  
**Status:** **APPLIED** — awaiting operator PASS  
**APPLY:** `MOB-APPLY ANALYTICS-ENGINE-HEALTH-PILL-V1`  
**Parent:** `MOB-DISC-ANALYTICS-ENGINE-HEALTH-PILL-LIKE-SYSTEM-OK-20260730.md`

---

## What changed

| State | Look |
|-------|------|
| OK | Small green pill (same language as header **System OK**) |
| Not available | Red pill |
| Not licensed | Amber warn pill |
| Checking | Neutral muted pill |

Wording unchanged: **FR Engine — OK** / **ANPR Engine — OK** (plain, no OSS names).

Surfaces: Verify 1:1 `#ax-fr-sidecar-status` · ANPR `#ax-anpr-status`.

## Files

- `public/css/global.css` — `.ax-engine-health` + `.ok` / `.bad` / `.warn`
- `public/js/analytics-hub.js` — `paintEngineHealth`
- `public/index.html` — status class + cache bust CSS/JS

## Operator verify

1. Hard refresh.
2. Analytics → **Verify 1:1** — small green pill **FR Engine — OK** (not large white text).
3. Analytics → **ANPR** — same for **ANPR Engine — OK**.
4. If down / not licensed — red or amber pill.

## Lock

Analytics engine health uses compact System-OK-style pills; not large white hint lines.
