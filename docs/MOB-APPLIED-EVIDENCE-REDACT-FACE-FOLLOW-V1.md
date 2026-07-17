# MOB APPLIED — `mob-evidence-redact-face-follow-v1`

**Date:** 2026-07-16  
**Status:** APPLIED  
**Genre:** Evidence redaction (not live / wall / PTT / SIP)  
**Operator:** YuNet static-box path already tested — blurs everything. Do not re-prove that. This MOB replaces burn with **per-frame face-follow**.

**Parent disc:** `docs/MOB-DISC-REDACT-FACE-FOLLOW.md`

---

## What changed

| Piece | Change |
|-------|--------|
| `redaction-track/detect_faces.py` | New **`burn`** mode: per-frame YuNet + IoU hold-tracker + **tight ROI** Gaussian blur; reject huge/absurd boxes; no union-grow |
| `lib/faceTrackSidecar.js` | `burnFaceFollow()` |
| `lib/faceRedactRegions.js` | `buildTightSampleRegions()` for editor preview (not FFmpeg union boxes) |
| `lib/evidenceWorkflow.js` | `applyFaceFollowRedaction()` — sidecar burn → mux audio with bundled ffmpeg; optional manual regions after |
| `server.js` | `POST .../redact` accepts `faceFollow: true`; autoface returns tight preview + `faceFollow: true` |
| `public/js/evidence-hub.js` | Auto face-follow flag; Save burns per-frame; manual boxes after auto = plates/extra only |
| `public/locales/en.json` | Face-follow strings |

---

## Product behavior

1. **Auto face-follow** → tight preview boxes for review (not sticky fat unions).
2. **Save** (after auto) → re-detect + blur **each frame** (tracker hold), then mux original audio. Original sealed.
3. Manual draw without auto → still old static FFmpeg regions path.
4. Manual boxes drawn **after** auto → applied on top of face-follow (plates / extra).

FFmpeg is used only to **mux audio / optional manual overlays / encode** — **not** as the face-tracking blur engine.

---

## Not touched

- Live wall, pin mirror, PTT, SIP
- WVP-ZLM path
- Firmware Gold cores

---

## Rollback

Revert the files listed above. Static `applyRedaction` path remains.

---

## Note

Operator asked: no YuNet re-test. Ship-gate desk PASS still required at pack time (clip + review + sealed original) per face-follow disc — not a daily nag.
