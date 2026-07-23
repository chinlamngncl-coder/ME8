# MOB DISC — Redaction still misses movement / frames (enhance)

**Date:** 2026-07-23  
**Status:** APPLIED — `MOB-APPLIED-REDACT-HOLD-SMOOTH-V1-20260723.md`  
**Operator:** Auto redaction still **misses some movement and frames** (clear flashes / gaps while person moves)  
**Genre:** Evidence redact quality (not FR live Recent; not Download/Finalize UX)  
**Parent:** `MOB-DISC-REDACT-FACE-QUALITY-MISS-REFINE-20260722.md`

---

## Straight verdict

| Claim | Truth |
|-------|--------|
| Redact “not saving” / finish loop | **Separate** — finish UX already PASS genre |
| Can Auto catch every moving face perfectly | **No** — detector + hold + pad limits |
| Phase 1 knobs already landed | **Yes** — `REDACT-FACE-QUALITY-KNOBS-V1` (hold **14**, IoU **0.18**, turn rematch, blend; **pad stayed 0.12** — no fat body box) |
| Next = fatter blur pad | **No** unless you reverse that constraint |
| Next = YuNet default | **No** — parked (false positives) |
| Next useful enhance | **Hold + interpolate** between detects so motion gaps stay blurred |

This is the same “missed parts” quality path — not a new product.

---

## Why movement/frames still clear

1. **Detector miss** — profile, helmet, far, motion blur → no box that frame.  
2. **Hold ends** — after knobs, hold ~**14** frames (~0.5s @30fps). Longer turn away still opens a clear gap.  
3. **No interpolate** — between detects the box jumps / drops; fast walk leaves unblurred frames.  
4. **Manual fixed box** — does not chase; motion leaves the rectangle. Prefer Auto face-follow + manual only for leftovers.  
5. **Preview stride** — yellow Auto preview is sparse; **final burn** is denser — judge the MP4, not preview alone.

---

## What you can do now (no APPLY)

1. Prefer **Auto face-follow** for walking faces.  
2. After Auto, **draw** on leftover faces/plates → Save again.  
3. Hard clips: expect some misses; knobs cannot invent a face Seeta never sees.  
4. Do **not** ask for bigger pad if body cover was the reject reason.

---

## Recommended single next APPLY

**`MOB-APPLY REDACT-HOLD-SMOOTH-V1`**

| Change | Why |
|--------|-----|
| Stronger **hold** (lab-tunable, e.g. 14 → **20–24**) | Bridge longer detector dropouts on turns |
| **Interpolate / coast** box between detect hits | Kill blink clear frames while face moves |
| Keep **pad 0.12** unless you explicitly reverse | Honor “no fat body box” |
| Optional denser **preview stride** (3 → 2) | Review closer to burn (slower Auto click) |

**Risk:** slightly longer blur trail after face leaves frame; rare wrong-track linger. Prove on one worst BWC clip.

**Do not bundle** with FR snap-faster or security.

**Later if still weak:** `REDACT-PREVIEW-CONTROLS-BURN-V1` (deleted preview controls burn) → then tracker upgrade. See parent phase table.

---

## Operator verify (after APPLY)

1. Restart Fleet.  
2. Same hard walking/turning clip → Auto → Save → Finalize → Download.  
3. Scrub playback: clear-face **flashes during motion** should be fewer/shorter.  
4. Blur box should **not** suddenly cover half the torso (pad unchanged).

---

## Related

| Doc | Role |
|-----|------|
| `MOB-DISC-REDACT-FACE-QUALITY-MISS-REFINE-20260722.md` | Full cause + phase order |
| `MOB-APPLIED-REDACT-FACE-QUALITY-KNOBS-V1-20260722.md` | Phase 1 done |
| `MOB-DISC-FR-LIVE-SNAP-FASTER-20260723.md` | **Different** — live Recent lag (Analytics) |

**Phrase when ready:** `MOB-APPLY REDACT-HOLD-SMOOTH-V1`
