# MOB-DISC ANPR Fast plate-OCR + FTP inbox placement — 2026-08-14

**Status:** planning. **No APPLY.**  
**Operator:** Leave **Offline Match** UI as-is (no route-away MOB). Do **not** park Fast plate-OCR or FTP inbox — plan both.  
**Related:** `MOB-DISC-ANPR-FTP-SNAPSHOT-LIBRARY-PLAN-20260813.md`, `MOB-DISC-ANPR-ENGINE-STRATEGY-STOP-WHACKAMOLE-20260814.md`

---

## A) Fast plate-OCR swap (quality)

**Goal:** Replace RapidOCR (generic) with **plate-trained ONNX** reader (`fast-plate-ocr` CCT v2 / FastALPR OCR path), keep PH Stage-2 YOLO detect + LTO gate + current Snapshot/Bulk UI.

| Keep | Change |
|------|--------|
| `anpr-sidecar` process (isolated from FR/Weapon) | OCR engine implementation |
| Stage-2 `ph_id` plate box + 30% pad | Reader: RapidOCR → **fast-plate-ocr** (or FastALPR OCR module) |
| `/read` + Node matchProbe + 2-col UI | Health badge still `ocr: ready` |

**Suggested APPLY (when ordered):** `ANPR-FAST-PLATE-OCR-SWAP-V1`  
**Scope:** `anpr-sidecar` primarily (`rapid_ocr_engine` or dual_lpr OCR call site). No FR/Weapon. No Offline tab redesign.

**Order vs FTP:** Either order is fine. **Recommend OCR first** if plate reads still feel soft; **FTP first** if dock photo browse is the pain.

---

## B) FTP uploads — where do they live?

### Not a second photo vault

| Layer | Location | Role |
|-------|----------|------|
| **Bytes** | Existing Fleet FTP root (`storage/ftp-uploads` or `FM_FTP_ROOT`) | **One place** for dock/BWC FTP drops (all cameras’ uploads under that root / dock subfolders) |
| **Browse UI** | Enrich **Offline Match → Image Investigation → FTP inbox** (already stubbed) | Operator picks files that **already landed** via FTP |
| **After OCR** | Plate lists + optional History | Same as Snapshot / Bulk |

**Answer in plain English:**  
Yes — **all FTP uploads stay in one storage tree** (the server FTP root). We do **not** invent `storage/anpr-ftp-only/`. ANPR only **lists and opens** files from that inbox for OCR + watchlist.

### Is it “all FTP in one place” in the UI?

**Storage:** one FTP root (by dock/camera folders underneath).  
**UI:** one **FTP inbox** panel (Offline Match image side) — show thumbs + **camera/folder + date** when we enrich it.  
**Not:** a new ANPR top tab “FTP Snapshot Library” (rejected earlier).  
**Not:** dumping FTP into Snapshot Bulk automatically (Bulk stays operator drag-drop; FTP inbox is “pick from dock”).

### How it works (operator story)

1. BWC/dock FTP → files appear under FTP root (existing ingest).  
2. Operator opens **Offline Match → Image** (leave as today) → **FTP inbox** → Refresh.  
3. Click thumb → select → Run Scan (existing image-scan / read path).  
4. Optional later: multi-select from inbox → same as Bulk (second APPLY if needed).

Snapshot Bulk stays for **local multi-drop**. FTP inbox stays for **already-on-server dock files**. Two entry points, **one disk**.

---

## C) Suggested APPLY names (operator picks)

| APPLY | What |
|-------|------|
| `ANPR-FAST-PLATE-OCR-SWAP-V1` | OCR engine upgrade in sidecar |
| `ANPR-OFFLINE-FTP-INBOX-META-V1` | FTP inbox: BWC/folder + date columns; still Offline Match; files stay on FTP root |

**Do not APPLY** `ANPR-OFFLINE-IMAGE-ROUTE-TO-STATIC-V1` — Offline left as-is.

**Offline Video:** not in this disc’s APPLY list; start only when you name a video MOB.

---

## D) FR / Weapon

FTP browse = Node file list. Fast plate-OCR = **ANPR process only**. Still **three separate sidecars** — no shared Python with FR/Weapon.
