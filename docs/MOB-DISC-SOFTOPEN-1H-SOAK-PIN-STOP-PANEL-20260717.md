# MOB DISC — 1h Soft Open soak (both died) · KK pin “crazy up” · pin Stop kills panel

**Date:** 2026-07-17  
**Status:** DISC only — no code  
**Operator:** Ran ~1 hour Soft Open; both BWCs did not survive; KK pin went crazy up; **Stop live on pin also stops panel** (wrong — design: panel keeps playing, pin minimizes).

---

## A) What the log shows for the ~1h soak

| Time (+08) | Event |
|------------|--------|
| **19:42:40** | Chin Soft Open — `live broker wvp-zlm primary` `:18088` |
| **19:42:41** | KK Soft Open — same |
| **19:57 → 20:28** | KK **re-fetch** `wvp-zlm primary` several times (~15–17 min gaps) |
| **20:40 → 20:54** | Chin re-fetch `wvp-zlm primary` several times (~4–5 min gaps) |
| **20:56:03 / 05** | `stop-video from dashboard` Chin then KK → WVP `stopPlay` ok |
| **20:56:41+** | Soft Open again (brief) |
| **20:57:11 / 12** | Stop both again |
| **20:57:26+** | Soft Open again |
| **20:57:47 / 48** | Stop both again |

**Read:** Keepalive/reopen **did fire** (extra `wvp-zlm primary` lines without a full new Soft Open at 19:42). Session lasted on the order of **~1h14m** (19:42 → 20:56) with repeated viewer reopens — then both ended via **dashboard `stop-video`** (operator Stop, or a path that still emits stop), not a silent server crash with zero events.

**Verdict on keepalive APPLY:** Partial PASS as band-aid (extended life past earlier ~1–5 min KK death). **FAIL as “survive 1h rock-solid”** — both eventually died / were stopped; reopen storm is not product-grade.

Browser-only `[me8-softopen] reopen` lines are not in `fleet.log` — server only sees descriptor re-fetch + stop bridge.

---

## B) Design lock — pin Stop vs panel

| Action | Intended |
|--------|----------|
| Pin **Stop live** | Tear down **pin** video chrome; **minimize** pin; **wall/panel keeps playing** |
| Pin **Minimize (−)** | Hide pin video box only; wall unchanged |
| Wall **Stop** | Stop wall **and** pin (shared stream end) |

Comment already in code (`stopPinLive`): *“Pin stop only affects the map popup player, not the wall stream.”*  
Smoke checklists agree. **Soft Open broke this asymmetry.**

---

## C) Why pin Stop kills Soft Open panel (root cause)

### Chain (confirmed in code)

```
.click .map-pin-stop
  → stopPinLive(camId)
      → destroyMapPlayer(camId)          // pin only — OK
      → cleanupGhostLiveChrome(camId, { pinLabel, minimize })
           → for each wall slot bound to cam:
                destroyZlmWallOverlay(idx)   // ← KILLS PANEL PICTURE
      → releaseServerStreamIfIdle(camId)
           → if wallHasPlayerForCam false → emitOpsStopVideo → WVP BYE
      → minimizeMapPinVideo
```

`cleanupGhostLiveChrome` was built for **ghost / Soft Open player fail** (tear wall ZLM + pin junk).  
`stopPinLive` reused it for pin stop → **wrong for Soft Open**: wall overlay is destroyed even when `resetWallStage` is false.

### Two failure modes operator can see

| Mode | What happens | Panel |
|------|----------------|-------|
| **A (common Soft Open)** | Overlay destroyed; `activeStreams` still set → `wallHasPlayerForCam` true → **no BYE** | Picture **dead / black**; session may still be “live” on cam |
| **B** | After overlay gone, idle release or other path clears claim → `stop-video` | Panel + WVP stop (matches late soak stops if pin Stop used) |

Classic Fleet JSMpeg wall often **survives** pin Stop (`destroyZlmWallOverlay` no-op; `players.has` keeps idle guard). Soft Open is the regression.

### What fix should do (later MOB — not applied now)

Named candidate: **`mob-softopen-pin-stop-spare-wall-v1`**

- Pin Stop: destroy pin mirror / pin chrome / minimize only.  
- **Do not** call `destroyZlmWallOverlay` from pin Stop.  
- Split `cleanupGhostLiveChrome` into pin-only vs fail (wall reset) helpers.  
- `releaseServerStreamIfIdle` must treat Soft Open wall claim (`activeStreams` / ops wall) as busy — already mostly does if overlay not wiped first.

---

## D) KK pin “went crazy up”

Most likely **UI layout storm**, not GPS teleport (unless you also saw the marker jump on the map).

On Soft Open prove **and each reopen**, wall calls:

- `ensureSoftOpenPinLiveChrome` (may `setPopupContent` / `openPopup` / rebuild HTML)  
- `expandMapPinVideo`  
- `syncMapPopupPlayer` (×3 staggered)  
- `stopPinLive` also calls `refreshOpenPinPopups`

Colocated Chin+KK use **fan / dock / stack** offsets. Rebuild + expand + refresh on every keepalive reopen can:

- Reset dock ring / fan offset  
- Re-open or re-measure popup height (live video vs minimized)  
- Look like KK popup **shoots upward** or stacks wrong

Secondary: GPS/jitter on kk while popup dock follows marker — usually smaller than fan rebuild.

**Later MOB (after pin-stop fix):** reopen must **not** rebuild pin popup HTML or call full `refreshOpenPinPopups` unless chrome missing; keep dock offsets.

---

## E) Why both BWCs “did not survive” the hour

| Factor | Role |
|--------|------|
| Viewer stall / mpegts | Keepalive reopened (log re-fetches) — temporary |
| Reopen budget / quality | After many stalls, tile dies or looks dead |
| Pin Stop / wall Stop | Emits real WVP `stopPlay` — cam live ends |
| Soft Open pin↔wall coupling | Pin actions / ghost cleanup can kill panel mid-soak |
| Device pause / toilet / Wi‑Fi | Possible; need OSD “cam ended” vs “viewer lost” (prior disc) |

Soak FAIL is **not** “keepalive never ran.” It is “keepalive ≠ 1h rock-solid + Soft Open UI coupling still unsafe.”

---

## F) Suggested APPLY order (you choose)

| # | MOB | Purpose |
|---|-----|---------|
| **1** | `mob-softopen-pin-stop-spare-wall-v1` | Pin Stop → minimize pin only; **panel keeps Soft Open picture** |
| **2** | `mob-softopen-reopen-no-pin-fan-storm-v1` | Reopen without popup rebuild / fan jump |
| **3** | Session health / viewer-lost OSD | Honest end state without call storm (prior disc) |
| — | Keepalive | Keep as band-aid; do not raise max reopen as the fix |

---

## One line

**1h soak: reopen helped then both ended; Soft Open pin Stop wrongly destroys wall ZLM (design: panel stays, pin minimizes); KK “up” likely reopen→pin chrome/fan storm.**

---

## You

Confirm what you meant by KK pin crazy up:

1. **Popup** jumped up on screen, or  
2. **Map marker** moved north, or  
3. Both  

Then say **`MOB-APPLY softopen-pin-stop-spare-wall-v1`** (recommended next) when ready.
