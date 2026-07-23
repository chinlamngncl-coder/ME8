# MOB DISC — FAIL pin empty · Open All kk gone · triple baseline compare · bring back

**Date:** 2026-07-21 ~00:02  
**Status:** LOCKED — FAIL + evidence · **no APPLY until you order**  
**Operator:** Click pin = nothing. Open All → **kk gone**. Worse after 6th destroy. Compare **all** baselines **3 times**. Almost same → that difference is what to change. Bring our things back.

---

## FAIL (locked)

| Symptom | Status |
|---------|--------|
| Click map pin → empty / nothing | **FAIL** |
| Open All → kk gone | **FAIL** |
| Stacked pin MOBs tonight | **Made it worse** — agreed |

Not a “refresh harder” problem. Not a yes-agent “it will work.”

---

## Rule you ordered (how we compare)

1. Compare **all** real `video-wall.js` baselines.  
2. Do it **three ways** (file hash · function-body hash · WVP marker count).  
3. Where **baselines agree**, that is **product law** — live must match (or only add player paint).  
4. Where **only live differs**, that is the **scar** — restore baseline, keep only WVP player delta.

---

## Triple compare results (`public/js/video-wall.js`)

Baselines checked: **me8-v1**, **Firmware Gold (2026-07-06)**, **poc-demo**, **pre-gate-c**, **classic-pass (2026-07-18)**, **live**.

### Pass 1 — whole file SHA16

| Tree | SHA16 (prefix) | Size |
|------|----------------|------|
| v1 | `79737ea4…` | ~177KB |
| gold | `f8361bab…` | ~192KB |
| poc = preg | `db330e3a…` | ~194KB (**identical files**) |
| classic | `73c3b6db…` | ~199KB |
| **live** | `108a5135…` | ~211KB |

Live is **not** any baseline. Expected if WVP player grafted; not OK if pin open/Call died.

### Pass 2 — pin function bodies (this is the smoking gun)

| Function | Baselines agree? | Live vs classic | Live vs gold |
|----------|------------------|-----------------|--------------|
| `ensurePopupsForLiveWallCams` | **YES — identical all** (incl. live) | SAME | SAME |
| `wallCanvasForCam` | **YES — identical all** | SAME | SAME |
| `startMapMirrorFromWall` | gold=classic=poc=preg **identical** | **DIFF** | **DIFF** |
| `openAllLivePins` | gold ≠ classic; poc=preg | **SAME as classic** | DIFF gold |
| `focusMapPinQuiet` | gold=poc=preg; classic different | **DIFF** | **DIFF** |
| `attachMapPopupPlayer` | gold=poc=preg; classic different | **DIFF** | **DIFF** |

### Pass 3 — WVP markers (player-only layer)

| Tree | `wvpHandoff` | `me8-zlm-primary` | `wallMirrorSource` | `attachWvp` |
|------|--------------|-------------------|--------------------|-------------|
| All baselines | **0** | **0** | **0** | **0** |
| **live** | 21 | 4 | 3 | 8 |

**Also live-only:** `wallMirrorSourceForCam`, `wallHandoffVideoForCam`, `attachWvpHandoffFlvToWallSlot` — **missing in every baseline** (correct for classic; required for FLV paint).

---

## What that means in plain English

1. **Pin auto-open helper is not the scar** — `ensurePopupsForLiveWallCams` is **byte-identical** to Gold/classic. We were not “missing open.”  
2. **Baselines are mostly the same on pin law** — open + canvas helper unchanged across Gold→classic era.  
3. **Live scar = player/mirror + attach/focus drift** — `attachMapPopupPlayer` / `focusMapPinQuiet` / `startMapMirrorFromWall` no longer match classic (or Gold). That matches: **click pin → nothing**, Open All weirdness.  
4. **Open All body already matches classic** — “kk gone” is likely **wall assign / handoff / online**, not a different `openAllLivePins` from classic. Still FAIL; fix after pin attach is classic again.  
5. **Only legitimate live-only delta** = WVP FLV wall attach + mirror from `<video>` (baselines have zero of that).

So: **you were right.** Almost all baseline pin UX is the same. We should **bring classic/Gold pin attach+focus+mirror UX back**, and change **only** the paint source for WVP — not invent open/chase/FOCUSED again.

---

## Why agent “destroyed 6 times”

Each MOB edited the **same scar zone** (`attachMapPopupPlayer` / mirror / focus) instead of:

> copy classic (or Gold) functions → graft **only** `attachWvp*` + video branch in mirror.

That is the opposite of the baseline-link rule (`MOB-DISC-BASELINE-LINK-NOT-REDO-PTT` same idea for PTT).

---

## Bring our things back — one next APPLY (when you say it)

**`MOB-APPLY PIN-LINK-CLASSIC-PASS-PLAYER-GRAFT-V1`**

### Exact job

1. **Link from** `baseline/2026-07-18-classic-pass/public/js/video-wall.js` (classic PASS floor you trust for desk UX):  
   - `attachMapPopupPlayer`  
   - `focusMapPinQuiet`  
   - `startMapMirrorFromWall` (canvas Gold/classic body)  
2. **Re-graft only** live WVP player pieces that baselines lack:  
   - keep `attachWvpHandoffFlv*` / `wvpHandoffFlvByCam`  
   - extend mirror: if no canvas, mirror `video.me8-zlm-primary` when wall Live (minimal; no chase; no FOCUSED-OPEN)  
3. **Do not** rewrite `ensurePopupsForLiveWallCams` (already identical).  
4. **Do not** redesign Fit pins / Open All body (already = classic).  
5. Hard refresh only for test.

### PASS

- Click pin → chrome + picture (or streaming until wall Live, then picture)  
- Call / PTT / Stop present and usable  
- Open All → **Chin and kk both stay** (or FAIL names which missing)

### Nuclear (only if you type it)

`RUN RESTORE-ME8-CLASSIC-PASS-20260718` or `RUN RESTORE-ME8-FIRMWARE-GOLD` — AI never auto-restores; that can wipe WVP until re-graft.

---

## Agent forbidden

- Another “fix jump by killing open” MOB  
- Yes-agent “will work” without your PASS  
- Hardcoding Chin/kk  

---

## One line

**Triple compare: pin open is already baseline-identical; live scar is attach/focus/mirror + WVP player. Bring classic pin UX back and graft FLV paint only — `MOB-APPLY PIN-LINK-CLASSIC-PASS-PLAYER-GRAFT-V1`.**
