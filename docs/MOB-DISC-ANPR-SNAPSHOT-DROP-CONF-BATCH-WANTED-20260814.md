# MOB-DISC ANPR Snapshot UX — drop % / batch wanted search — 2026-08-14

**Status:** planning. **No APPLY.**  
**Context:** Snapshot PASS; confidence % is noise; operator uses plate text + watchlist, not scores.

---

## Snapshot card (what operators need)

| Keep | Drop |
|------|------|
| Plate text (OCR) | **Confidence: N%** — remove from Snapshot result card |
| Crop thumb (if present) | Low-confidence coaching essays on a successful read |
| List line: **List hit** / **Not on plate list** (clear wording) | Treating % as a quality gate for humans who can see the plate |

**Product intent (locked):**  
Snapshot / crop / image OCR is for **hard or many photos** — blurred plates, dock dumps, “is this plate on wanted/blacklist?” — not for teaching operators about model scores.

**Suggested APPLY (UI only, when ordered):**  
`ANPR-SNAPSHOT-DROP-CONF-PERCENT-V1`  
- Hide/clear `#ax-anpr-confidence` on success.  
- Keep list match line; prefer copy **“Not on plate list”** when no hit (same meaning as “No list match”).  
- Do not change OCR math.

---

## Batch search — “another level”

**Need:** drop many pics → analytics scans → surface **wanted / blacklist / suspicious** hits.

**Recommendation (one path):**  
Add as **Offline Match → Image Investigation → Batch** (or a sub-mode), **not** a new ANPR top tab and **not** Live.

| Step | Owner |
|------|--------|
| Operator selects/drops many images (or folder / FTP inbox multi-select) | UI Offline Match |
| Each file → existing `POST /api/analytics/anpr/read` or `image-scan` | Node → ANPR sidecar (already static) |
| After OCR → `anprPlateList.matchProbe` | Node (already) |
| Show only hits (or hits first) + plate + thumb + list grade | UI batch results rail |
| Optional: write History rows | Node `anprCaptureHistory` |

**Do not:** run batch inside Python live watch; do not merge FR/Weapon; do not require confidence %.

**Storage:** reuse upload temp / FTP inbox paths; no second photo vault.

**Suggested later APPLY (after drop-conf PASS):**  
`ANPR-OFFLINE-BATCH-WANTED-SCAN-V1`  
- Multi-file drop + progress + “Wanted hits only” filter.  
- Same static OCR path as Snapshot/Offline single image.

**Gate:** Snapshot single-image list line wording PASS → then batch.

---

## Explicit non-goals

- Offline Video (still separate; still later).  
- Bringing Live back for batch.  
- Showing model % as the primary result.

---

## Next step for operator

1. Say **`MOB-APPLY ANPR-SNAPSHOT-DROP-CONF-PERCENT-V1`** to remove % and tighten list copy.  
2. After that PASS, discuss batch UI details only if you want **`ANPR-OFFLINE-BATCH-WANTED-SCAN-V1`**.
