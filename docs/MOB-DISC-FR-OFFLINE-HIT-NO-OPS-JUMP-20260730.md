# MOB DISC — FR offline-video hit must not jump Ops / play BWC

**Date:** 2026-07-30  
**Status:** **APPLIED** via `FR-OFFLINE-HIT-ALERT-ONLY-V1` (2026-07-30)  
**Search:** offline video FR hit, goOpsOnHit, promoteFrBlacklistLive, Analytics Face  
**Operator:** Offline video playing → got a hit → UI jumped to **map** and started a **BWC panel** (device not live). Want: **alert only** (toast / HQ bar / chime as usual) — **no** Ops jump, **no** wall/pin live play.  
**Related:** `MOB-DISC-FR-OFFLINE-HIT-ALERT-ONLY-V1-APPLIED.md` · `mob-fr-hit-go-ops` · `FR-BLACKLIST-MAP-PIN-TAKEOVER-V1` · `MOB-DISC-ANPR-OFFLINE-HIT-ALERT-ONLY-PARITY-20260730.md`

---

## Plain English

1. **Got it.** Offline video is investigation, not a live BWC stream. A match should still **alert** — but must **not** yank you to Operations or force a wall panel live for that `camId`.  
2. Root cause is shared live-hit path: `showHit` → `goOpsOnHit` → map focus + `VideoWall.promoteFrBlacklistLive(camId)`. Offline hits reuse that path with `source: 'offline-video'`.  
3. Fix: treat `source === 'offline-video'` (and any clear offline mark) as **alert-only** unless operator explicitly clicks **Go to map**.

---

## Evidence / code path

| Step | What happens today |
|------|-------------------|
| Offline job match | `lib/frOfflineVideo.js` emits `fr-blacklist-hit` with `source: 'offline-video'` |
| UI | `fr-alarm.js` `onHit` → `showHit` |
| Auto Ops | `showHit` always calls `goOpsOnHit(hit)` |
| Live steal | High tier → `promoteFrBlacklistLive(hit.camId)` ~480ms later |
| Bad effect | Jump to map + wall tries BWC for a label that is **not** a live online cam |

Operator stays on Analytics watching offline video; auto jump breaks that workflow.

---

## Desired behavior

| Hit source | Alert (toast / HQ / chime / rail) | Auto jump Ops + map | Auto wall/pin live |
|------------|-----------------------------------|---------------------|--------------------|
| Live BWC (today) | Yes | Yes (tier rules) | Yes (blacklist high) |
| **Offline video** | **Yes** | **No** | **No** |
| Explicit **Go to map** | — | Yes (if GPS / useful) | No live steal from offline |

Stay on Analytics. Investigation **Play at** crop time stays available (existing offline play dialog).

---

## Recommended MOB (one path)

### `FR-OFFLINE-HIT-ALERT-ONLY-V1`

| # | Change | File |
|---|--------|------|
| 1 | Helper `isOfflineVideoHit(hit)` → `source === 'offline-video'` (and jobId if needed) | `public/js/fr-alarm.js` |
| 2 | `goOpsOnHit`: if offline and **not** `opts.explicit` → **return** (skip tab switch, map focus, `promoteFrBlacklistLive`) | `fr-alarm.js` |
| 3 | `showHit` / score-upgrade paths: still show toast + HQ bar + chime; call `goOpsOnHit` only for live (or let goOps gate it) | `fr-alarm.js` |
| 4 | Keep `source: 'offline-video'` on server hit payload (already set) | `lib/frOfflineVideo.js` — verify only |
| 5 | Optional toast hint once: “Offline video match — stay on Analytics” (lab/ops clarity) | i18n if wanted |

**Do not:** disable offline hits entirely · remove Go to map button · change live BWC go-ops rules.

---

## PASS / FAIL

| Check | PASS |
|-------|------|
| Offline video → blacklist/suspect hit | Alert toast / HQ bar / chime |
| Same hit | **Stay** on Analytics Face (no Ops tab jump) |
| Wall | **No** auto live panel for that hit |
| Live BWC FR hit | Unchanged go-ops / promote behavior |
| Explicit Go to map on offline hit | Optional: map only if useful; **still no** forced live BWC |

---

## Operator decide

When ready:

- **`MOB-APPLY FR-OFFLINE-HIT-ALERT-ONLY-V1`**

**No code in this disc.**

---

## Lock record

| Item | Decision |
|------|----------|
| Offline hit = alert only | **Accepted** |
| Auto Ops + BWC play on offline | **Bug** — **fixed** in APPLIED MOB |
| MOB | **`FR-OFFLINE-HIT-ALERT-ONLY-V1` APPLIED + PASS** (2026-07-30) |
| ANPR parity | Recorded — `MOB-DISC-ANPR-OFFLINE-HIT-ALERT-ONLY-PARITY-20260730.md` |
