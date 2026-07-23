# MOB DISC / GOOGLE CONFIRM — Ops wall panel aspect ratio (what we did vs still wrong)

**Status:** DISC only — 2026-07-19 · **no APPLY**  
**For:** Google + operator — confirm wall AR / soft stretch  
**LAN:** `192.168.1.38` · Ops `:3988` · ZLM FLV `:18088`  
**Related APPLYs:** `MOB-APPLY-FRONTEND-ZLM-PRIMARY-V2`, `MOB-APPLY-PIN-STOP-RES-FIX`, `MOB-APPLY-ZLM-OVERLAY-OVERFLOW-CLIP`  
**Not in scope here:** pin popup width/height chrome (separate discs)

---

## Operator claim

> Panel wall aspect ratio still not correct — like you did not fix it.

**Verdict: Claim is fair.** We did **not** reshape the wall panel to native camera AR. We only put **`object-fit: contain`** (+ overflow clip) on the ZLM `<video>`. That is a **fit mode**, not an **aspect-ratio layout fix**.

---

## What was actually applied (wall-related only)

| APPLY | File | Exact change | What it does |
|-------|------|--------------|--------------|
| ZLM primary v2 | `video-wall.js` `mountWallZlmPrimary` | Broker `engine:zlm` → `softAttachZlmOverlay(stage, desc)` | Mounts mpegts `<video>` on wall stage |
| Pin-stop-res / contain | `live-player-factory.js` | `video.style` includes `object-fit:contain !important` + absolute `width/height:100%` | Letterbox inside stage; **does not** change stage shape |
| `MOB-APPLY-ZLM-OVERLAY-OVERFLOW-CLIP` | `live-player-factory.js` | `host.style.overflow = 'hidden'` | Clips bleed outside stage; **does not** fix AR |

**Current factory line (live):**

```js
// public/js/live-player-factory.js — softAttachZlmOverlay
video.style.cssText =
  'position:absolute;left:0;top:0;width:100%;height:100%;' +
  'object-fit:contain !important;aspect-ratio:auto;background:#000;z-index:2;';
host.style.overflow = 'hidden';
```

**Not applied for wall:**

- No CSS `aspect-ratio: 16 / 9` (or 4/3) on `.video-slot-stage` / `.video-slot-box`
- No wall panel geometry change to match **1280×720**
- No switch to `object-fit: cover` (fill + crop)
- No change to JSMpeg canvas fit (legacy path still stretches)

---

## Why AR still looks wrong (architecture)

```
Camera encode (typical WVP/ZLM primary):  1280 × 720  (16:9)
        │
        ▼
Ops wall slot stage:  .video-slot-stage { flex:1; min-height:0; … }
                      → shape = whatever the 6-slot wall grid allocates
                      → usually NOT exactly 16:9
        │
        ▼
ZLM <video> 100%×100% + object-fit:contain
        │
        ├─ If stage taller than 16:9 → black bars left/right (or soft “pillar”)
        ├─ If stage wider than 16:9 → black bars top/bottom
        └─ Picture keeps AR, but panel looks “wrong” / small / soft vs filled classic JSMpeg
```

**Classic JSMpeg canvas path (still in CSS):**

```css
.video-slot-stage .video-canvas { width: 100%; height: 100%; … }
/* no object-fit — canvas bitmap is stretched to fill stage → can look distorted */
```

So:

| Path | Fit behavior | AR truth |
|------|--------------|----------|
| ZLM `<video>` + contain | Correct AR, letterbox | Looks “not filling” / soft in small panel |
| JSMpeg canvas 100% fill | Stretches to stage | Can look wrong AR (squashed/stretched) |

Operator “incorrect aspect ratio” may mean either:

1. **Letterboxing** (contain working; stage ≠ 16:9) — expected with current APPLY  
2. **Stretch** (JSMpeg fallback or CSS without contain) — still possible on Fleet path  
3. **Soft / small** (720p scaled into small flex cell) — not encode CIF; see prior Google handoff

---

## Wire vs UI (already proven for Google)

From `MOB-DISC-GOOGLE-HANDOFF-PIN-BLANK-WALL-SOFT-ZLM-20260719.md`:

- ZLM track: **H.264 1280×720 @ ~20fps**, `isSubStream=false`  
- Soft look is **UI scale / panel size / object-fit**, not wrong stream type  
- Confirm: open FLV URL fullscreen in browser — if sharp there, encode is fine

---

## How Google / operator confirm in lab (checklist)

1. **Open one cam on Ops wall** (ZLM primary).  
2. DevTools → select `video.me8-zlm-soft-overlay`:
   - Computed `object-fit` → **`contain`**
   - `videoWidth` / `videoHeight` → expect **1280 × 720** (or cam native)
3. Measure `.video-slot-stage` box (getBoundingClientRect):
   - Compare `width/height` ratio to `16/9 ≈ 1.778`
   - If stage ratio ≠ 1.778 → **letterbox is expected** with contain  
4. Optional: same FLV in new tab fullscreen — AR should look correct there.  
5. If element is `canvas.video-canvas` instead of ZLM video → you are on **Fleet/JSMpeg** path (stretch), not the contain fix.

---

## What would be a real AR “fix” (future APPLY — not done)

Only if operator names one:

| Option | Effect |
|--------|--------|
| A. Stage `aspect-ratio: 16/9` + letterbox outside stage | Panel shape matches cam; contain fills stage cleanly |
| B. Keep stage, use `object-fit: cover` | Fills panel, **crops** edges |
| C. Keep contain, enlarge wall cell | Less soft; still letterbox if AR mismatch |

**Do not confuse** with pin popup width/height MOBs — those do not fix Ops wall stage AR.

---

## One line for Google

**We only set ZLM wall video to `object-fit:contain` + overflow clip; we did not change `.video-slot-stage` geometry to 16:9 — so panel AR can still look wrong (letterbox or soft scale) even though wire is 1280×720.**

---

## Your call

No file edits from this disc. If you want a real wall AR fix, name e.g. **`MOB-APPLY-WALL-STAGE-16x9`** (option A) or **`MOB-APPLY-WALL-ZLM-OBJECT-FIT-COVER`** (option B).
