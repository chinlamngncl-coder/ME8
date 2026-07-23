# MOB DISC — Pin popup opens, video black · baselines OK · WVP/ZLM scar (for Google)

**Date:** 2026-07-21 ~00:18  
**Status:** APPLY executed — see `docs/MOB-APPLIED-PIN-MIRROR-USE-WALL-VIDEO-SOURCE-V1-20260721.md`  
**Operator FAIL (screenshot):** Pin **DEVICE STATUS** popup **opens** (Call / Voice / PTT / Live video chrome). Video box is **black**. Wall may already be Live. Stack shows Chin + kk.  
**Tonight’s click MOB:** `PIN-CLICK-POPUP-OPEN-NO-DOCK-STORM-V1` — **chrome open worked**. This disc is the **picture** fail only.

---

## One-screen verdict (give this to Google)

| Fact | Truth |
|------|--------|
| What baselines already did well | Pin popup + **picture** by **mirroring the wall JSMpeg canvas** (`startMapMirrorFromWall` → `wallCanvasForCam` → RAF `drawImage`). One stream. Firmware Gold / classic-pass. Confirmed identical across Gold + classic-pass + pre-gate for **open/dock** UX. |
| What WVP/ZLM MVP changed on wall | Wall Live paint is **not** a canvas anymore. Handoff uses `Me8LivePlayerFactory.attachFlvPrimary` → `<video class="me8-zlm-primary">` (mpegts/FLV). JSMpeg canvas is gone / not the paint surface. |
| Why pin is black now | Pin mirror still effectively needs a **wall canvas**. Under handoff there is **no canvas** → `startMapMirrorFromWall` returns **false** → pin host stays black (or “Live streaming…”). Popup chrome is unrelated. |
| Is WVP “wrong”? | **No.** Wall handoff is the locked video base. Pin was never finished as **mirror-from-video** after later pin rewrites. Do **not** turn off `FM_WVP_VIDEO_HANDOFF`. Do **not** rebuild Fleet. |
| Was this fixed before? | **Yes.** `MOB-APPLY-WVP-HANDOFF-PIN-MIRROR-FROM-VIDEO-V1` (2026-07-20) operator **PASS** — pin showed same picture as wall. Then classic restore + pin “graft” MOBs **scarred the mirror body** again. |

**Translation:** Baselines prove pin UX. MVP ZLM proves wall picture. Pin black = **mirror source not wired to `<video>` in the live function that paints the pin** — not “Google map broken,” not “click broken,” not “need new app.”

---

## What the screenshot proves

| Layer | Result |
|-------|--------|
| Leaflet pin click → popup | **PASS** (DEVICE STATUS visible) |
| Pin chrome (Live video / Voice / PTT) | **PASS** (UI present) |
| Pin **pixels** | **FAIL** — black box |
| Product rule | Pin picture = **same as wall** (mirror), not a second FLV |

So: last APPLY fixed “click does nothing.” This FAIL is **paint**, not open.

---

## Baseline vs live (agent-confirmed, for Google)

### Classic / Firmware Gold (PASS pin picture)

```
Wall Live  = JSMpeg → <canvas> in .video-slot-stage
Pin Live   = startMapMirrorFromWall
             → wallCanvasForCam(camId)   // MUST find canvas
             → RAF drawImage(srcCanvas → pin canvas)
```

Baselines (`baseline/2026-07-18-classic-pass`, Firmware Gold) have **zero** WVP FLV wall attach. Pin mirror **only** knows canvas. That is correct for classic.

### Live lab after WVP handoff (PASS wall, FAIL pin)

```
Wall Live  = attachFlvPrimary → <video class="me8-zlm-primary">
Pin path   = attachMapPopupPlayer
             → wallMirrorSourceForCam(camId)   // CAN find video (helper exists)
             → startMapMirrorFromWall(...)     // STILL requires wallCanvasForCam
             → if (!srcCanvas) return false;   // ← scar / incomplete graft
             → pin stays black
```

**Smoking gun in live `public/js/video-wall.js` (current tree):**

1. Helpers **exist**: `wallHandoffVideoForCam`, `wallMirrorSourceForCam` (canvas first, else handoff `<video>` when wall decoded).
2. `attachMapPopupPlayer` **gates** on `wallMirrorSourceForCam(camId)` (so it *knows* video should work).
3. `startMapMirrorFromWall` **still** does classic-only:

```js
const srcCanvas = wallCanvasForCam(camId);
if (!srcCanvas) return false;
```

4. The same function then references `srcKind` in the RAF loop (`srcKind === 'canvas' ? … : videoWidth`) **without defining `srcKind`** — leftover half-graft from `PIN-LINK-CLASSIC-PASS-PLAYER-GRAFT-V1`. Docs claimed “classic RAF + videoWidth graft”; the **entry** still refuses non-canvas. That is the fuck-up.

**Flow when wall is FLV Live and operator opens pin:**

1. `wallMirrorSourceForCam` → `{ kind: 'video', el: <video.me8-zlm-primary> }` (truthy).
2. `startMapMirrorFromWall` → no canvas → **false**.
3. Attach shows overlay / returns without mirror → **black box**, chrome still says Live video.

---

## Timeline (why it feels like “you already fixed this”)

| When | What | Pin picture |
|------|------|-------------|
| Classic / Gold baselines | Canvas wall + canvas mirror | **PASS** |
| Soft Open / Jul 17 `SOFTOPEN-PIN-MIRROR-FROM-VIDEO` | Mirror wall `<video>` | Pattern exists |
| Jul 20 `WVP-HANDOFF-PIN-MIRROR-FROM-VIDEO-V1` | Same pattern for handoff | Operator **PASS** |
| Later restores + pin FOCUSED / WALL-BASELINE / LINK-CLASSIC graft | Re-linked classic `startMapMirrorFromWall` canvas body; helpers left half-wired | **FAIL again** (this screenshot) |
| Jul 21 `PIN-CLICK-POPUP-OPEN-NO-DOCK-STORM-V1` | `index.html` open/dock only | Opens chrome; **does not paint** |

Prior disc already named this architecture: `docs/MOB-DISC-WVP-HALF-PASS-PIN-BLACK-JUL19-LOST-20260720.md`. Tonight is the **same split**: wall handoff OK, pin mirror canvas-only.

---

## What is NOT wrong (do not send Google down these)

- Fit pins / Open All rewrite  
- Killing auto-open / FOCUSED-OPEN again  
- Turning off WVP handoff / parking ZLM  
- Second FLV player on the pin (forbidden — storm + Firmware Gold contract)  
- “Baselines never had pin video” — **false**; they had mirror-from-**canvas**  
- Leaflet / Singapore map tiles  

---

## Correct fix shape (one MOB — when operator APPLYs)

**Name:** `PIN-MIRROR-USE-WALL-VIDEO-SOURCE-V1`  
(or re-apply exact intent of `WVP-HANDOFF-PIN-MIRROR-FROM-VIDEO-V1`)

**File:** `public/js/video-wall.js` only (cache bust).

| Must do | Detail |
|---------|--------|
| `startMapMirrorFromWall` | Use `wallMirrorSourceForCam(camId)` — not `wallCanvasForCam` alone |
| RAF | `drawImage` from canvas **or** `<video>` using `videoWidth`/`videoHeight` when `kind === 'video'` |
| Define `srcKind` | From the source object; remove undefined `srcKind` scar |
| Keep | One stream = mirror wall; no second FLV on pin; Stop = minimize pin only |
| Proof | Wall panel has picture → pin popup shows **same** picture after hard refresh |

**Do not** rewrite dock, Fit pins, or click handlers in that MOB.

---

## Operator ask (after you APPLY that MOB)

1. Hard refresh once.  
2. Wall Chin Live with **visible picture**.  
3. Click Chin pin.  

| PASS | FAIL |
|------|------|
| Pin box shows same picture as wall | Still black / “Live streaming…” stuck |

---

## Bottom line for Google

**Baselines are correct for classic (canvas→canvas). MVP ZLM is correct for wall (`<video>`). Live pin is black because `startMapMirrorFromWall` was classic-linked again and never actually consumes the handoff `<video>` helper that already exists — a known half-pass scar, previously PASS under `WVP-HANDOFF-PIN-MIRROR-FROM-VIDEO-V1`, then broken by later pin grafts. Fix = finish mirror-from-video in that one function; keep WVP on; keep Fleet.**
