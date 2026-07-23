# MOB-DISC — Phase 4 FLV-on-ready failed; operator stop

**Date:** 2026-07-20 ~14:37  
**Status:** DISC only — **no code**  
**After:** `MOB-APPLY-BACKEND-VIDEO-UI-FLV-ON-READY-V1`  
**Operator:** Live still failed. **No more SOS / PTT / other tests tonight.**

---

## Verdict (one screen)

| Layer | Status | Notes |
|-------|--------|-------|
| Cold SOS (prior) | Was **PASS** | Not re-tested this round — ACL unchanged |
| WVP backend handoff | **PASS** | `handoff start` · `192.168.1.38:18088` · no `startPlay fail` |
| Phase 4 UI lift | **FAIL** | Screen still dark after hard refresh attempt |
| PTT / Call | **FAIL** | Out of scope — **parked** |

**5060:** unchanged.

Backend split is doing its job. **Browser paint still does not.**

---

## Log proof (~14:34–14:37)

```
14:34:41  wvp video handoff start  …009  flvHost 192.168.1.38:18088
14:35:06  wvp video handoff start  …008  flvHost 192.168.1.38:18088
14:35:15  wvp video handoff start  …009  flvHost 192.168.1.38:18088
14:36:55  stop-video  …008
14:36:56  stop-video  …009
14:36:59  hard-stop ok (both)
```

- Many `invite skipped` `wvp_video_handoff` — correct.
- **No** `video-stream-error` on server.
- **No** `startPlay fail`.
- Operator held both cams ~2 minutes then stopped — long enough for mpegts prove (10s) if attach had worked.

Server cannot see whether the browser mounted FLV (no UI telemetry in this APPLY).

---

## What Phase 4 was supposed to do

On `video-stream-ready { wvpVideoHandoff: true, flvUrl }`:

1. Skip JSMpeg-first + 2.2s soft overlay.
2. Mount `attachFlvPrimary` (mpegts) on each wall slot bound to that cam.
3. Work for Open All / multi-tile (no `wallZlmSoftUpgradeAllowed` gate).

Files: `live-player-factory.js` (`attachFlvPrimary`), `video-wall.js` (handoff map + listener), cache bust on `index.html`.

---

## Why it likely still failed (ranked — disc, not proven in browser)

### 1 — mpegts never proves (most likely if attach ran)

FLV URL points at **`:18088`** (cross-port from dashboard **`:3988`**). mpegts uses HTTP fetch; if ZLM returns no frames, CORS blocks, or codec mismatch → `attachFlvPrimary` **prove timeout** → overlay removed → black tile (may show “player error” briefly).

Backend `startPlay` OK only means WVP **asked** ZLM to play — not that the browser received decodable FLV.

### 2 — Slot render timer wipes FLV (race)

`assignCamToSlot` schedules **`stage.innerHTML = ''`** at **+300ms** and creates a fresh canvas.

If `video-stream-ready` + FLV attach happens **before** that timer fires (fast **reused** handoff), the timer can **wipe the video element** and fall back toward JSMpeg on an empty Fleet WS.

Slow handoff (~1–2s) usually avoids this; fast reuse may not.

### 3 — Handoff arrives before slot is bound

`attachWvpHandoffFlvForCam` only mounts where `dataset.camId` / `pendingWallSlots` already match. Retries at 450ms and 1100ms help; Open All stagger (300ms per cam) may still miss on some slots.

### 4 — Slot key mismatch (code smell)

Handoff attach iterates `getSlots().forEach(..., idx)` using **array index**, while elsewhere slots use **`data-slot`** via `findSlotIndex()`. If DOM order ever diverges, FLV mounts on the wrong `players` key → wrong tile stays black.

### 5 — Stale JS (one-time check)

Cache bust is `?v=20260720-flv-on-ready-v1`. One missed hard refresh = old listener (ignores `flvUrl`). Not assumed as root cause if refresh was done.

---

## Architecture status (honest)

```
SOS:     :5060 → ACL → sos-alarm           ✅ (prior PASS; not re-run)
Live:    startPlay → FLV URL backend       ✅
         mpegts paint on Ops wall           ❌ (Phase 4)
PTT:     29201                             ❌ parked
```

Google backend split **Step 1 + Step 3 backend** = done.  
**Step 3 browser paint** = still open after two UI attempts (soft overlay path, then FLV-on-ready).

---

## What we are **not** doing now

- No more operator test matrix tonight (SOS / PTT / Open All loops).
- No freestyle “small obvious” fixes.
- No classic restore / go-back unless you explicitly order it.
- No PTT APPLY until you want live picture revisited.

---

## Forward options (when you say APPLY — pick one later)

| Name | Intent |
|------|--------|
| **`MOB-APPLY-BACKEND-VIDEO-FLV-PROXY-SAME-ORIGIN-V1`** | Backend: emit `/api/lab/wvp/flv?…` on `:3988` instead of direct `:18088` — avoids cross-port fetch |
| **`MOB-APPLY-BACKEND-VIDEO-UI-FLV-RACE-FIX-V1`** | UI: defer/cancel `stage.innerHTML` wipe when handoff FLV already mounted; use `findSlotIndex` not forEach idx |
| **`MOB-APPLY-BACKEND-VIDEO-UI-FLV-DIAG-V1`** | UI: one console line on attach/prove/fail (operator-visible) — diagnose without more server guessing |
| **`MOB-APPLY-PTT-…`** | **Parked** until live picture PASS or you reorder |

---

## For Google (unchanged ask)

Backend-only ceiling was lifted once; paint still fails. Need Google call: **same-origin FLV proxy vs direct :18088**, and whether **`assignCamToSlot` render timer** must be handoff-aware.

---

## One line

Phase 4 executed; backend handoff **PASS** in log; dashboard **still dark** — most likely **browser mpegts/FLV fetch or slot timing race**, not WVP or SOS. **Stopped here.** No further tests until you say otherwise.
