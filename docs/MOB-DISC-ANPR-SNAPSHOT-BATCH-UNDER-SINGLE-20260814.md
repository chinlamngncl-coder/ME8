# MOB-DISC ANPR Snapshot batch under single — 20260814

**Status:** planning. **No APPLY.**  
**Operator ask:** Put batch **here** (Snapshot tab), **below** the existing single photo / Read plate card. Limit **100** pics. Drag-and-drop (or equivalent). Same job: OCR → plate lists (wanted / blacklist). Drop confidence % noise (separate small APPLY).

---

## Do I understand?

**Yes.**

1. **Same ANPR → Snapshot tab** — not a new top sub-tab, not Offline Video, not Live.  
2. **Layout:** existing single PHOTO + PLATE READ stays on top; **batch zone below** on the same page.  
3. **Batch = many still images** (up to **100**), drag-drop / multi-select.  
4. Purpose: scan for **list hits** (wanted / suspicious / blacklist), not confidence theater.  
5. Same backend path as single: Node `anpr/read` (or image-scan) + `matchProbe` — no new Python live engine.

---

## Doable?

**Yes.** Fully doable with current static sidecar + plate lists.

| Piece | How |
|-------|-----|
| UI | New block under Snapshot workspace: dropzone “Drop up to 100 photos”, file input `multiple`, queue list, Run batch, results table/rail |
| Limit | Client + server hard cap **100** files per run |
| Pipeline | Queue serial or small parallel (e.g. 2–3 at a time) `POST /api/analytics/anpr/read` per file |
| Output | Rows: thumb, plate, **List hit / Not on plate list**, grade if hit; filter “Hits only” |
| Failures | Per-file error row; don’t abort whole batch |

Optional later: pull from FTP inbox multi-select — **not** required for v1.

---

## Sketch (same page)

```
[ Snapshot sub-tab ]

  ┌─ Single ─────────────────────────────┐
  │ PHOTO | crop | Read plate | PLATE READ │
  └──────────────────────────────────────┘

  ┌─ Batch (below) ──────────────────────┐
  │ Drag & drop up to 100 photos         │
  │ [Run batch scan]  Hits only ☑        │
  │ results: plate · list status · thumb │
  └──────────────────────────────────────┘
```

Design tone: same enterprise cards / dropzone language as single Snapshot — one composition, batch is the second section (not a dashboard of widgets).

---

## Also still true (from prior disc)

- Remove **Confidence: N%** from single result card when APPLY ordered.  
- Batch does not show % either.

---

## Suggested APPLYs (order)

1. `ANPR-SNAPSHOT-DROP-CONF-PERCENT-V1` — hide %; list copy “Not on plate list”.  
2. `ANPR-SNAPSHOT-BATCH-WANTED-V1` — batch dropzone below single, max 100, list-hit results.

No code until operator says the exact **MOB-APPLY** name.
