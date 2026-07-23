# MOB DISC — Redaction still misses parts · how to capture more accurately

**Status:** Phase 1 APPLIED 2026-07-22 — `MOB-APPLIED-REDACT-FACE-QUALITY-KNOBS-V1-20260722.md`  
**Operator note:** pad **not** raised (body cover); hold↑ + turn rematch for frame/direction gaps.  
**Mode:** Further phases still paper until named `MOB-APPLY`  
**Search:** `miss face`, `redact incomplete`, `blur missed`, `accuracy`, `refine auto face`  
**Trigger:** Operator: redaction results still miss some parts — how to refine software for more accurate capture  
**Genre:** Evidence redact quality (not Prior exports / Download UX)

---

## Straight verdict

| Claim | Truth |
|-------|--------|
| Software is “broken / not saving” | **Usually no** — burn ran; some faces/frames were **not detected or not held** |
| Auto face-follow is ship-quality PASS | **No** — code APPLIED; **desk quality PASS still open** (see `MOB-DISC-REDACT-TAB-HONEST-NOT-SHIP-DONE.md`) |
| Manual box alone can cover a moving face for whole clip | **Often fails** — box is **fixed**; person walks out of it |
| Deleting a yellow Auto preview box stops that face on Save | **No today** — preview is review-only; burn **re-detects every frame** |
| Fix = turn handoff off / rebuild Evidence | **Forbidden / wrong** — refine knobs + tracker + review→burn |

**Missed parts are expected with current defaults** on hard BWC clips (angle, helmet, distance, motion, crowd). Refinement is a **quality genre**, not another finalize UX MOB.

---

## What the software does today (two burns)

| Mode | When | What gets blurred |
|------|------|-------------------|
| **Auto face-follow** | Auto → Save | Detector finds faces **per frame** → short “hold” if detect flickers → blur a padded box around each track |
| **Manual only** | Draw boxes → Save (no Auto) | Same drawn rectangle for the chosen time span — **does not chase** the face |

Auto yellow boxes on screen = **sparse preview** (samples every few frames).  
Final file = **fresh burn** (detect every frame). Preview and final can disagree.

Default engine: **Seeta** (`FM_REDACT_FACE_ENGINE=seeta`). YuNet is parked for Auto (false-positive history).

---

## Why parts still get missed (root causes)

### A — Detector never saw the face
- Profile / looking away, helmet, mask, tiny/far face, motion blur, backlight  
- Max **6 faces per frame** — crowded scenes drop extras  
- Absurd-size filter can drop very large close-ups or tiny noise boxes  

### B — Face seen, then “blinks” clear (hold too short)
- If detect fails for more than **~4 frames** (~0.1–0.15 s at 30 fps), track dies → **unblurred frames** until re-hit  
- Looks like “missed parts” in playback even when most frames are OK  

### C — Blur box too tight (partial face still visible)
- Default pad about **12%** of box size — hairline, ears, chin, neck often stick out  
- Fast head turn: blur lags one–few frames behind the face  

### D — Manual path / wrong time span
- **Whole clip** + fixed box → subject moves → clear face outside the box  
- **±1 s window** around draw time → motion outside that window stays clear  

### E — Product gap (review does not control burn)
- Operator deletes a bad Auto preview → burn can still blur (or miss) that person  
- No “keep only these faces” / exclude list today  

---

## What you can do **right now** (no APPLY)

1. Prefer **Auto face-follow** for moving faces; use **manual draw** for plates / fixed objects / anything Auto never tags.  
2. After Auto, **draw extra boxes** on leftover faces/plates, then Save (manual layers **on top of** face-follow).  
3. For a face that moves a lot: draw, set span to **From here to end** or **Whole clip**, and enlarge the box — still imperfect, but better than ±1 s.  
4. Re-Save a **new** draft after adjusting (do not expect Finalize to re-blur).  
5. Hard refresh after any quality MOB lands.

IT / lab proof path: compare source vs `storage\evidence-exports\…\*_redacted_*.mp4` frame-by-frame on one known-bad clip.

---

## How we refine the software (recommended order)

One recommendation: **start with knobs already in the engine**, prove on your worst clip, then tracker / review wiring. Do **not** jump to a new AI product.

| Phase | MOB name | What it changes | Risk | Why this order |
|-------|----------|-----------------|------|----------------|
| **1** | `REDACT-FACE-QUALITY-KNOBS-V1` | Larger pad, longer hold, optional IoU / face-count / Seeta score gates; wire knobs from Node → sidecar (some flags exist but are underused) | Low–med | Cheap; targets A–C without new models |
| **2** | `REDACT-HOLD-SMOOTH-V1` | Longer hold + smooth/interpolate box between detects — kill blink gaps | Med | Fixes “missed frames” when detector flickers |
| **3** | `REDACT-PREVIEW-CONTROLS-BURN-V1` | Deleted Auto preview controls burn (exclude seeds) | Med | **APPLIED** 2026-07-23 |
| **4** | `REDACT-TRACKER-UPGRADE-V1` | Stronger multi-object tracker (research path already in `MOB-DISC-REDACT-FACE-FOLLOW.md`) | Higher | Only after knobs prove insufficient |
| **5** | `REDACT-PLATE-PERSON-V1` | Plate / full-person detectors for tender Tier-3 | Higher | Separate from face accuracy |

**2026-07-23 operator refresh:** still missing movement/frames after Phase 1 → next APPLY named in `MOB-DISC-REDACT-MOTION-FRAME-GAPS-20260723.md` → **`REDACT-HOLD-SMOOTH-V1`**.

### Phase 1 detail (what “more accurate” means in code terms)

| Knob (today approx.) | Direction for fewer misses | Trade-off |
|----------------------|----------------------------|-----------|
| `--pad` **0.12** | Raise (e.g. 0.18–0.25) | More background blurred |
| `--hold-frames` **4** | Raise (e.g. 8–15) | Slightly longer blur after face leaves |
| `--iou` **0.25** | Tune + **pass from Node** (burn path under-wired today) | Wrong merges if too loose |
| Max faces / frame **6** | Raise for crowd clips | Cost / false boxes |
| Preview stride **3** | Lower for denser Auto preview | Slower Auto click |
| Manual FFmpeg pad | Add pad around drawn box | Same as Auto pad idea |

**Not recommended as first move:** switch default back to YuNet, rebuild Evidence, or “park” face-follow.

---

## Verify PASS (when Phase 1 is APPLIED)

| # | Test | Pass |
|---|------|------|
| 1 | Same hard BWC clip as today → fewer clear-face frames in redacted MP4 | ☐ |
| 2 | Hair/ears less often sticking out of blur | ☐ |
| 3 | Short detect dropouts no longer flash a clear face (or much rarer) | ☐ |
| 4 | Crowd / close-up: no new “blur half the screen” regression | ☐ |
| 5 | Manual plate box still works on top of Auto | ☐ |

---

## Related (do not confuse)

| Topic | Doc |
|-------|-----|
| UI / Download / Finalize | Recent `REDACT-*-VISIBLE` / `CLEANUP` APPLIED docs |
| Honest “not ship done” | `MOB-DISC-REDACT-TAB-HONEST-NOT-SHIP-DONE.md` |
| Seeta vs YuNet | `MOB-DISC-REDACT-YUNET-VS-SEETA-AGENT-FAULT.md` |
| Face-follow design / research | `MOB-DISC-REDACT-FACE-FOLLOW.md` |
| YuNet over-blur history | `MOB-DISC-ZLM-WHEN-AND-REDACT-BLUR-EVERYTHING.md` |

---

## Ask

When ready to change code for accuracy:

**`MOB-APPLY REDACT-FACE-QUALITY-KNOBS-V1`**

Bring **one worst clip** (or say which EXP / source name) so we tune pad/hold against what you actually see missed — not a generic guess.
