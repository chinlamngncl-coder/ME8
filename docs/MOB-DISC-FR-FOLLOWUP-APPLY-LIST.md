# MOB DISC — Follow-up APPLY list (now) + risk

**Status:** DISC only — **no APPLY** until you name a MOB  
**Date:** 2026-07-13  
**Trigger:** “Give me the mob list apply listing, risk, we can follow up now”  
**Focus:** FR replacement / match honesty first; UX parks after  
**Related:** `MOB-DISC-FR-PARKED-NEXT-AND-REFRESH.md`, `MOB-DISC-FR-REPLACEMENT-STATUS.md`

---

## How to use

1. Walk the **NOW** table top → bottom (or skip with reason).  
2. Say **`MOB-APPLY <mob-id>`** one at a time.  
3. Checkpoint after anything touching live / FR / map.  
4. Genre push later: `lab-git-push-fr-investigation-ux` then `lab-git-push-fr-engine` when each genre PASS.

---

## NOW — recommended follow-up order

| # | MOB-APPLY | What you get | Risk | Checkpoint? | Notes |
|---|-----------|--------------|------|-------------|-------|
| **0** | *(no MOB)* Manual re-enroll **one** watchlist face + live walk-test | Proves ONNX match before bulk | **Low** | Mini: live + rail match | Do this **before** #1 if gallery is small |
| **1** | `mob-fr-gallery-re-enroll-migrate` | Bulk re-embed watchlist for ONNX dims | **Medium** | FR live match walk | **APPLIED 2026-07-13** — Watchlist → **Re-embed gallery**; backup `index.pre-{engine}-*.json` |
| **2** | `mob-fr-engine-cutover` | Code/ship default → onnx; DeepFace = flag only | **Medium–High** | Full FR + health card | **APPLIED 2026-07-13** — match still lab-failed; cutover ≠ score fix |
| **3** | `mob-fr-probe-side-face-gate` | Softer side-face / walking rejects | **Low–Medium** | Live walking BWC | Optional; after match is honest |

---

## NEXT — ops UX (after match PASS, or if you insist earlier)

| # | MOB-APPLY | What you get | Risk | Checkpoint? | Notes |
|---|-----------|--------------|------|-------------|-------|
| **4** | `mob-fr-holds-disposition-status` | Clear/Close hold + reason + history filter | **Low** | Evidence holds only | No live video touch |
| **5** | `mob-fr-holds-hold-number` | Human `IH-…` numbers | **Low** | None / light | Can bundle with #4 if you say so |
| **6** | `mob-fr-map-close-restore-view` | FR Close restores map zoom | **Medium** | Ops map + **live pin video** | Hard rules: no closePopup on device pins; `animate:false`; skip if live pin open |
| **7** | `mob-fr-holds-link-case` | Link hold → Case file | **Low–Medium** | Case files | After disposition exists |
| **8** | `mob-fr-hold-play-at` | Play from Investigation hold when video linked | **Low** | Offline play still works | Needs offline play path (already APPLIED) |

---

## LATER — refresh / enterprise F5 (separate genre)

| # | MOB-APPLY | What you get | Risk | Checkpoint? | Notes |
|---|-----------|--------------|------|-------------|-------|
| **9** | `mob-live-viewer-grace-disconnect` | ~90s grace: F5 doesn’t instantly kill BWC encode | **High** | **VC · PTT · SOS · live wall · Open All** | Touches live viewer lifecycle — one MOB, soak |
| **10** | `mob-operator-session-restore` | Reopen cams/pins/tab after reload (≤8) | **High** | Same as #9 | After grace PASS only |
| **11** | `mob-fr-watch-session-restore` | FR watch set restored | **Medium** | Analytics FR | After #10 |

---

## Already APPLIED this wave (don’t re-APPLY)

| MOB | Area |
|-----|------|
| `mob-fr-kept-evidence-ui` | Investigation holds list |
| `mob-fr-map-keep-require-crop` | Keep needs crop |
| `mob-fr-map-snap-real-expand` | Superseded by side-dock |
| `mob-fr-map-expand-side-dock` | Expand → map side dock |
| `mob-fr-map-pin-floating-tag` | FR pin label |
| `mob-fr-grab-warm-gate` | Stable still grab |
| `mob-fr-offline-crop-play-at` | Play from any offline crop |
| `mob-fr-engine-lab-enable-onnx` | Lab `.env` onnx (not ship cutover) |

---

## Risk legend

| Risk | Meaning |
|------|---------|
| **Low** | UI/data; unlikely to break live/PTT/SOS |
| **Medium** | FR match or map behaviour; mini checkpoint |
| **High** | Live stream lifecycle / multi-surface; full smoke |

---

## Suggested “start now” line

```text
0) Manual re-enroll one face + walk-test
1) MOB-APPLY mob-fr-gallery-re-enroll-migrate   (if many faces)
2) MOB-APPLY mob-fr-engine-cutover             (after match PASS)
```

Then either holds (#4) or map restore (#6) or refresh genre (#9) — your call.

**Locked default if you say “just go”:** start at **#0 manual**, then **#1**.

---

## No code in this DISC

Reply with the first **`MOB-APPLY …`** when ready.
