# MOB DISC — Watchlist enroll crop tool (guided to our specs)

**Status:** **Applied** `mob-fr-enroll-cropper` 2026-07-10  
**Search:** `enroll crop`, `FrEnrollCropper`, `enroll-preflight`, `license-free crop`  
**Related:** soft-quality · false-small · dossier

---

## Shipped

| Piece | Detail |
|-------|--------|
| UI | Watchlist → pick photo → **Crop & check** modal (drag square frame) |
| Meters | Face ≥160 · image ≥480 · sharpness/lighting approx |
| Preflight | `POST /api/analytics/fr/enroll-preflight` — **same** size + represent/quality gate as enroll |
| Export | JPEG crop, pad to ≥480 (no face upscale) |
| License | **Vanilla canvas only** — no Cropper.js / no third-party crop lib |

## Legal / license

Original ME8/Ubitron code in `public/js/fr-enroll-cropper.js`.  
**No** npm crop widgets. Facenet/DeepFace remain existing local sidecar stack (unchanged by this MOB).

## Honest limit

Crop fixes framing/size. Cannot invent sharpness from a mushy source — meter / preflight says retake.
