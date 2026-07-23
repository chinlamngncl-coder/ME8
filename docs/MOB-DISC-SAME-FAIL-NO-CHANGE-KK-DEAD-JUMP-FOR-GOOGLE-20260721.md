# MOB DISC — Same FAIL again · no visible change · Chin lights / kk dead · pin jumps (for Google)

**Date:** 2026-07-21 ~00:32  
**Status:** DISC only — **no APPLY until operator orders**  
**Operator:** *Fucking same. Doesn't work. BWC lights for Chin, kk always not light / always dead. Pin jumping again. I don't actually see a change at all from all your failed MOBs. Explain to Google.*

**Locked:** WVP stays. Fleet stays. No rollback. No park.

---

## One-screen verdict (paste to Google)

Operator is reporting **three different fails** as one “same MOB failed” feeling. They are **not** one bug.

| Lane | Symptom | Root class | Fixed by last pin MOBs? |
|------|---------|------------|-------------------------|
| **A — Cache / no change** | “I don't see a change at all” | Browser still loads `video-wall.js?v=20260721-pin-link-classic-pass-player-graft-v1` — **cache tag never bumped** after mirror fix (mandate forbade `index.html`) | **No proof new JS ran** |
| **B — Pin black** | Popup chrome OK, picture black | Pin must **mirror** wall WVP `<video>`; code on disk was patched, but (1) may not be loaded, and/or (2) mirror still gated / silent `drawImage` fail | **Unproven on desk** |
| **C — kk dead / no light** | Chin BWC lights when live; **kk never** | **Not pin mirror.** kk never gets a live WVP play / wall paint for that camId (SIP home / startPlay / wall Idle). Mirror cannot invent pixels | **Wrong MOB class** |
| **D — Pin jump** | Popups snap / jump to top | **Dock storm still alive** on wall prove: `ensurePopupsForLiveWallCams` + `assignColocatedPinPopupDocks` when ≥2 live. Click dock cut was only half the storm | **Expected residual** |

**Baselines are not wrong.** Classic PASS = JSMpeg **canvas** wall → canvas pin mirror.  
**WVP MVP is not wrong as base.** Wall paint = FLV `<video.me8-zlm-primary>`.  
**Lab is wrong at the glue + ops proof:** Fleet UI functions assumed canvas; handoff removed canvas; pin rewrites / missing cache bust / kk not on WVP play path / auto-dock on multi-live prove.

---

## Why it feels like “every MOB failed”

### 1) You literally may not be running the last fix

Last execute (`PIN-MIRROR-USE-WALL-VIDEO-SOURCE-V1`) changed **only** `public/js/video-wall.js`.

Strategic mandate said: **DO NOT edit `index.html`.**

Live tag is still:

```html
<script src="/js/video-wall.js?v=20260721-pin-link-classic-pass-player-graft-v1"></script>
```

Same URL → many browsers keep the **previous** JS. Soft refresh = **identical behavior**. Even hard refresh is unreliable when `?v=` is unchanged.

So “no change at all” is a **process failure**, not proof that `wallMirrorSourceForCam` is impossible.

**Google check:** DevTools → Network → `video-wall.js` → Response search for string  
`PIN-MIRROR-USE-WALL-VIDEO-SOURCE-V1`  
- **Missing** → old JS (cache). Fix = **bump `?v=` in index.html** (one line).  
- **Present** → new JS loaded; black is a **runtime** mirror/paint problem (lane B).

### 2) Pin black ≠ click broken ≠ kk dead

Tonight’s sequence:

| MOB | What it touched | What operator can see if it worked |
|-----|-----------------|-------------------------------------|
| `PIN-CLICK-POPUP-OPEN-NO-DOCK-STORM-V1` | `index.html` click/dock | Popup **chrome** opens (DEVICE STATUS) — that part **did** happen earlier |
| `PIN-MIRROR-USE-WALL-VIDEO-SOURCE-V1` | `startMapMirrorFromWall` only | Pin **pixels** = wall picture — **not proven** (cache +/or runtime) |

Treating “chrome open + black box” as “MOB did nothing” mixes **PASS open** with **FAIL paint**.

### 3) kk never lighting is a different system

Prior disc (still true): `docs/MOB-DISC-KK-FAIL-CHIN-PASS-NO-HARDCODE-20260720.md`

Under `FM_WVP_VIDEO_HANDOFF=1`:

- Fleet SIP INVITE for live is **skipped** for every cam.
- Live requires WVP `startPlay` + FLV for **that** `camId`.
- Pin mirror copies **that cam’s wall slot**. If kk wall never Live / never FLV → pin and “BWC light” stay dead.

Chin lights = Chin got play/stream.  
kk no light = kk **did not** get the same play path (device SIP home still on Fleet `:5062`, WVP offline for `…009`, startPlay fail, panel Idle, etc.).

**No amount of pin RAF code lights kk’s BWC.** Wrong tool.

### 4) Pin jump is still in video-wall prove path

Click path dock doubles were cut in `index.html`.  
**Still present** in `video-wall.js` on WVP FLV prove when ≥2 live:

```js
ensurePopupsForLiveWallCams();
assignColocatedPinPopupDocks();
```

That **re-opens / re-docks** colocated Chin+kk pins → feels like “jumped to top.” Classic had this too on multi-live, but handoff prove fires in bursts → **more** jumps. Separate from black paint.

---

## Architecture Google must keep straight

```
CLASSIC (baseline PASS)
  BWC → Fleet SIP INVITE → MPEG-TS → JSMpeg → wall <canvas>
  Pin = RAF drawImage(wallCanvas)     ✅

WVP LAB (locked base)
  BWC → WVP :5060 → startPlay → FLV (proxy same-origin preferred)
       → mpegts → wall <video.me8-zlm-primary>
  Pin MUST = RAF drawImage(wallVideo)  ← Fleet function parity
  Pin MUST NOT = second FLV player     ← Gold contract

CURRENT DESK
  Chin wall picture: often OK
  Chin pin picture: FAIL / unproven (cache + mirror)
  kk wall / light: FAIL (registration/play — not mirror)
  layout jump: FAIL residual (ensurePopups+dock on prove)
```

Helpers already in tree: `wallHandoffVideoForCam`, `wallMirrorSourceForCam`.  
On-disk `startMapMirrorFromWall` (after last APPLY) uses them. **Desk has not proven that file is what the browser runs.**

---

## What is NOT the answer

- Turn off WVP / park handoff / restore classic media as product path  
- Rebuild Fleet / new app  
- Hardcode Chin  
- Another Fit-pins / Leaflet click rewrite before cache proof  
- Blaming “baselines didn’t have pin video” — they did (canvas mirror)  
- Expecting pin mirror MOB to fix **kk BWC light**

---

## Ordered next APPLYs (one at a time — agent pick)

### Next #1 (mandatory before any more mirror theory) — **CACHE PROOF**

**`MOB-APPLY PIN-MIRROR-CACHEBUST-AND-PROVE-LOG-V1`**

| Do | Detail |
|----|--------|
| Edit `index.html` **one line** | Bump `video-wall.js?v=20260721-pin-mirror-wall-video-v1` (or similar) |
| Optional one log | `console.log('[me8-pin-mirror]', camId, srcKind)` when mirror starts |
| Not | Dock, Fit pins, second FLV, kk SIP |

Operator: hard refresh → Network shows new `?v=` → click Chin with wall picture → PASS/FAIL pin pixels.  
If log shows `kind:video` and still black → next is draw/runtime. If no log → still cache.

### Next #2 (only if #1 loaded and pin still black) — **RUNTIME MIRROR**

**`MOB-APPLY PIN-MIRROR-DRAWIMAGE-RUNTIME-V1`**

Check in order: `videoWidth`/`videoHeight` > 0; `wallSlotDecodedForCam` not blocking forever; silent `drawImage` catch; same-origin FLV URL (`/api/lab/wvp/flv…` not raw `:18088` if CORS/taint). Fix only paint path.

### Next #3 (kk light / kk dead — parallel track, not pin) — **KK PLAY PATH**

**`MOB-APPLY` / ops:** Prove kk on WVP `:5060`, WVP device online, panel 2 Play → FLV prove. Use `MOB-DISC-KK-FAIL-CHIN-PASS-NO-HARDCODE-20260720.md`. Do not mix into pin mirror MOB.

### Next #4 (jump after paint PASS) — **HANDOFF DOCK STORM**

**`MOB-APPLY HANDOFF-SUPPRESS-AUTO-PIN-DOCK-STORM-V1`**  
Gate `ensurePopupsForLiveWallCams` + dock on FLV prove (keep Open All / SOS / user click). Do **not** kill baseline open again without naming it.

---

## Operator facts to give Google (desk)

1. Hard refresh after any JS MOB is useless if **`?v=` unchanged**.  
2. Chin BWC light ≠ pin mirror PASS.  
3. kk no light = **kk not live on WVP path** until proven otherwise.  
4. Pin jump can continue until prove-path dock is gated — even if paint later PASSes.

---

## Bottom line

**We did not “fail every baseline.”** We stacked WVP wall paint on Fleet UI that still expected canvas, then shipped pin MOBs without a **cache-bust proof**, while **kk registration/play** and **multi-live dock storm** kept producing the same desk feeling: black / dead / jump / “nothing changed.”

**Immediate truth:** Until DevTools shows the new `video-wall.js` body, Google should treat last mirror APPLY as **unverified delivery**, not as “mirror math impossible.”  
**Next named fix:** `PIN-MIRROR-CACHEBUST-AND-PROVE-LOG-V1` — then re-test Chin pin only. kk and jump are separate MOBs after that.
