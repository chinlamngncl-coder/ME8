# MOB DISC — FR enroll copy: ban “short side”

**Status:** Locked 2026-07-10  
**Search:** `short side`, `480`, `imageTooSmall`, `operator English`

---

## What “short side” meant (engineer only)

For a photo **width × height**, the **short side** is simply the **smaller number**.

| Example | Width | Height | Short side |
|---------|-------|--------|------------|
| Landscape | 2048 | 1427 | **1427** |
| Portrait | 720 | 1280 | **720** |
| Square | 480 | 480 | **480** |

Rule in code: `min(width, height) ≥ 480`.

That phrase is **fine in DISC / code comments**. It is **not** fine on the operator screen.

---

## Locked operator English (no jargon)

| Code | Say this |
|------|----------|
| `fr.image_too_small` | **This photo is too low-resolution. Use a clearer, larger photo (at least about 480×480 pixels).** |
| `fr.face_too_small` | **The face in this photo is too small. Crop closer so the face fills more of the picture, then try again.** |
| Blacklist helper | **Use a clear, front-facing ID or mugshot. The face should fill much of the frame. JPEG or PNG. Blurry, tiny-face, or group photos will be rejected.** |

**Do not show operators:** short side · long side · px gate · SOF · Laplacian · embedding.

---

## Apply with

`MOB-APPLY mob-fr-enroll-false-small` (copy + false-small fix together).
