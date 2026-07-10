# MOB DISC — Enroll quality cutoffs (industry-aligned) + false-small fix

**Status:** Locked + apply `mob-fr-enroll-false-small` 2026-07-10  
**Search:** `ICAO IED`, `enroll cutoff`, `160 px`, `face too small`, `short side ban`

---

## Industry anchors (not marketing)

| Source | Guidance (enrolment / portrait) |
|--------|----------------------------------|
| **ICAO TR Portrait Quality** | Inter-eye distance (IED) **≥ 90 px** minimum (legacy); **≥ 120** better for chip; **≥ 240** best practice for new capture. Live portrait often **≥ ~1200×1600** recommended. |
| **ISO/IEC face profiles** | Head width **≥ ~180 px** ≈ IED **~90 px** as a shall-level sampling floor for machine use. |
| **Facenet / our stack** | Network expects ~**160×160** aligned face — gallery faces below that are weak. |

We do **not** measure IED in v1 (no landmark step). **Proxy:** detected face box short edge (min of face width/height).

---

## Locked cutoffs (blacklist **enroll** only — probes stay softer)

| Gate | Cutoff | Why |
|------|--------|-----|
| File type | JPEG / PNG | Same as Verify |
| File bytes | **30 KB – 20 MB** | Junk vs abuse |
| Image min(width, height) | **≥ 480** | Reject thumbnails / icons — **not** “short side” in UI |
| **Face box min edge** | **≥ 160 px** (hard) | Above Facenet floor; toward ICAO head-width / IED spirit without claiming passport compliance |
| Face area % of image | **Only if face &lt; 200 px:** require area **≥ 3%**; if face **≥ 160 px**, **do not** reject on % alone | Stops “2K photo, decent face, fails 4%” false rejects |
| Sharpness (Laplacian on face crop) | **Hard reject only &lt; 25**; 25+ allow (was 100 — too harsh; see `MOB-DISC-FR-ENROLL-SOFT-QUALITY.md`) | Only block mush / motion smear |
| Lighting (mean luma on face) | **Hard reject only &lt; 15 or &gt; 245** (was 30–220) | Only near-black / blown |
| Faces | Exactly **1** | Multi → crop / re-shoot |

**Not claiming:** ICAO passport certification. We use industry **floors as product gates** for a reliable gallery.

**Probes (live / inbox):** keep softer (represent-probe, no A2 enroll gate).

---

## Operator English (banned: “short side”)

| Code | Text |
|------|------|
| `fr.image_too_small` | This photo is too low-resolution. Use a clearer, larger photo (at least about 480×480 pixels). |
| `fr.face_too_small` | The face in this photo is too small. Crop closer so the face fills more of the picture, then try again. |
| Helper | Use a clear, front-facing ID or mugshot. The face should fill much of the frame. JPEG or PNG. A large file is not enough if the face is tiny in the picture. |

---

## Engineering fixes in this MOB

1. JPEG SOF read up to **1 MB** (not 64 KB)  
2. Client pre-check: only reject when dimensions are **valid and** too small; never treat 0×0 as “too small”  
3. Sidecar enroll gate = table above + `gate` field on reject  
4. Plain-English i18n + helper  

---

## Bottom line

| Question | Answer |
|----------|--------|
| Cutoff for enroll face? | **160 px** min face box edge (hard) |
| Harsh 4% area on big photos? | **No** — absolute face size wins when ≥ 160 |
| “Short side” on screen? | **Banned** |
| Passport-grade? | **No claim** — ICAO-inspired floors only |
