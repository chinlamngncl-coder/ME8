# MOB DISC — Enroll sharpness/lighting too harsh (false “quality low”)

**Status:** Locked + applied `mob-fr-enroll-soft-quality` 2026-07-10  
**Search:** `quality_low`, `Laplacian`, `sharpness 25`, `enroll credits`  
**Related:** `MOB-DISC-FR-ENROLL-FALSE-SMALL.md`

---

## What went wrong

After face-size fixes, enroll still hard-rejects on:

| Gate (current code) | Default | Problem |
|---------------------|---------|---------|
| Laplacian variance on face crop | **≥ 100** | Far too strict for real JPEG / phone / ID scans. Visually sharp photos often score **40–90**. |
| Mean luma on face | **30–220** | Can false-fail mild underexposure / light backgrounds. |
| Operator copy | One string `fr.quality_low` | Same sentence for blur **and** lighting — feels like “your photo is junk.” |

**Primary enroll gates that matter:** one face · face large enough (≥160) · readable file.  
**Blur/lighting:** should only block **obvious** garbage — not “nice photo, JPEG compressed.”

---

## Credits / cost (clear)

| Myth | Fact |
|------|------|
| “Enroll burns FR cloud credits” | **No.** Facenet runs **local** in `fr-sidecar` (your PC). No per-enroll cloud FR bill. |
| What *does* cost | Your time, Cursor/agent turns, and restarts while we tune gates. |

Sorry for the thrash — gates were over-tuned after the false-small wave.

---

## Industry note (Laplacian)

There is **no single ICAO “Laplacian ≥ 100”** rule. ICAO/ISO talk about focus, IED, pose, illumination — not OpenCV Laplacian variance.  
Laplacian thresholds are **heuristic** and **JPEG-sensitive**. Using **100 as a hard enroll reject** was a lab mistake for product enroll.

---

## Locked cutoffs (replace prior sharpness/lighting rows)

| Gate | New lock | Reject? |
|------|----------|---------|
| Face box ≥ **160 px** | Keep | **Hard** |
| Exactly one face | Keep | **Hard** |
| Image min edge ≥ **480** | Keep | **Hard** |
| Sharpness (Laplacian) | Hard reject only if **&lt; 25** (clearly mushy). **25–99 → allow enroll** (optional audit warn later) | Soft |
| Lighting (mean luma) | Hard reject only if **&lt; 15** or **&gt; 245** (near black / blown). Else allow | Soft |
| Operator copy | Split: blur vs lighting; never imply “bad photo” when face size passed | — |

**Env defaults after MOB:**  
`FM_FR_ENROLL_MIN_SHARPNESS=25` · `FM_FR_ENROLL_MIN_LUMA=15` · `FM_FR_ENROLL_MAX_LUMA=245`

---

## Operator English (locked)

| Code / gate | Text |
|-------------|------|
| `fr.quality_low` + blur | This photo looks too blurry for a reliable enroll. Use a sharper picture. |
| `fr.quality_low` + lighting | This photo is too dark or too bright on the face. Use a clearer, evenly lit picture. |
| Prefer when unsure | Do **not** show quality_low if face size failed — show face message first. |

---

## Fix MOB

**Name:** `mob-fr-enroll-soft-quality`  
One pass: lower sharpness/luma hard floors · split copy · keep face-size as the real quality bar.

---

## Bottom line

| Question | Answer |
|----------|--------|
| Is a good 2K ID photo “quality too low”? | **Usually no** — Laplacian 100 was wrong for enroll |
| Cloud FR credits per try? | **No** — local engine |
| Next | **`MOB-APPLY mob-fr-enroll-soft-quality`** |
