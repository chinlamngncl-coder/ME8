# MOB DISC — FR engine lab → ship port (DeepFace is not the product)

**Status:** DISC 2026-07-11 — **`mob-fr-engine-bench-harness` APPLIED 2026-07-13** · **`mob-fr-sidecar-primary-poc` APPLIED 2026-07-13** (ONNX `fr-sidecar-fast`). Operator FAIL context: enroll/crop/snap “toy”; high-res PNG useless; slow  
**Trigger:** “Nothing works · looks lousy · we should start porting soon · DeepFace not even near good”  
**Search:** DeepFace bad, enroll quality, crop, slow FR, port engine, ONNX, SeetaFace, primary backup  
**Related:** `MOB-DISC-FR-ENGINE-PRIMARY-BACKUP.md`, `MOB-DISC-FR-ENGINE-SLOW-LOW-MATCH.md`, `MOB-DISC-FR-SNAPSHOT-RAIL-THRESHOLD.md`, `MOB-DISC-FR-HALF-FACE-SNAP-LEDGER.md`

---

## Plain answer — you are right

| You said | Truth |
|----------|--------|
| Crop / enroll bad | **Yes** — BWC MPEG frame vs studio PNG; opencv detector; tight portrait crop |
| High-res PNG useless | **Often yes** — embed model + detect path ≠ ID software; scale mismatch |
| Snapshots slow | **Yes** — 3× grab window + Python subprocess + TF cold path per tick |
| DeepFace not good | **Fair for production** — OK as **lab fallback**, not front engine |
| “Toy” | **Honest for customer demo** without engine port — UI can look enterprise while match engine is POC |

**We should start porting soon** — not more UI band-aids on DeepFace.

---

## Why it feels broken (stack truth)

```
BWC MPEG still (low light, motion, side angle)
  → Python fr-sidecar subprocess per grab
  → DeepFace detect (opencv backend) — weak on profile / small face
  → Facenet embed (512-d)
  → Node cosine × 100 vs enroll mugshot
  → threshold 75% — one probe per 3-grab window
```

| Layer | Problem |
|-------|---------|
| **Detect** | `opencv` misses profile / small / harsh crop |
| **Crop** | `object-fit: cover` rail + tight face box — operator sees “half chin” |
| **Embed** | Facenet not tuned for BWC; enroll photo ≠ field conditions |
| **Speed** | Serial grabs + process spawn + no batch |
| **Score** | Raw cosine % — not calibrated; verify API uses different formula |
| **Alert** | Same for all grades (separate DISC) |

**UI polish does not fix this.** Port engine + enroll pipeline + tiered alerts.

---

## What “porting” means (locked)

| Not | Is |
|-----|-----|
| Delete DeepFace day one | **Primary fast engine** + `FM_FR_ENGINE=deepface` rollback |
| New UI tab | Same REST: `/represent`, `/represent-probe`, enroll |
| Rebuild watch/ops | Swap **sidecar inference** only; Node `matchProbe` unchanged |

**Candidates (bench on your BWC stills + side-face):**

1. **ONNX** — SCRFD detect + ArcFace-class embed (InsightFace weights export)
2. **SeetaFace6** — Mobile detect + embed (CPU-friendly, load-once)

**Winner = default primary.** DeepFace = backup only.

---

## Port genre — MOB order (Act 2 — start now)

| # | MOB | Delivers | Blocks ship? |
|---|-----|----------|--------------|
| **1** | **`mob-fr-engine-bench-harness`** | CSV on lab stills: detect rate, embed ms, match % | No — proves winner |
| **2** | **`mob-fr-sidecar-primary-poc`** | `FM_FR_ENGINE=onnx\|seeta`; load-once; timing JSON | Yes for quality |
| **3** | **`mob-fr-capture-grab-tune`** | Lower grab ms, fail-fast, parallel where safe | Speed |
| **4** | **`mob-fr-enroll-quality-gate`** | Reject bad enroll + multi-angle hint; sidecar strict mode | Enroll |
| **5** | **`mob-fr-scene-crop-mode`** | Wider crop (face+shoulders) for rail + ledger | Crop UX |
| **6** | **`mob-fr-gallery-re-enroll-migrate`** | Re-embed all watchlist on new model | After POC PASS |
| **7** | **`mob-fr-engine-cutover`** | Default primary; document rollback | Ship gate |

**Parallel (UI):** tiered alerts, snap ledger UI, grade change — do not wait for engine.

---

## Enroll / crop quick wins (before full port)

| MOB | Fix |
|-----|-----|
| `mob-fr-enroll-multi-face-reject` | Already partial — stricter “one face centered” |
| `mob-fr-snap-rail-scene-display` | Taller rail, `object-fit: contain`, lightbox |
| `mob-fr-match-default-72` | Lab threshold 72 if obvious misses (not ship default) |
| `mob-fr-rail-per-tile-score` | Show % on each rail tile — operator sees why miss |

These **reduce toy feel** but **do not replace** engine port.

---

## Honest customer message

| Can say | Cannot say |
|---------|------------|
| Watchlist + live watch + alert workflow built | “ID-grade accuracy on all angles” |
| Engine upgrade path documented | DeepFace is production front end |
| Snap ledger + audit trail | Real-time match on every frame guaranteed |

---

## PASS — engine port genre

| # | Test |
|---|------|
| 1 | Bench: primary **≥2× faster** than DeepFace on 50 BWC stills |
| 2 | Bench: primary **match rate ↑** same gallery (document FP) |
| 3 | Re-enroll 8 lab faces → live watch PASS |
| 4 | `FM_FR_ENGINE=deepface` rollback still works |
| 5 | Operator: “not toy” on side-face lab set (subjective PASS) |

---

## APPLY cheatsheet

```text
# Start port genre (bench first — no UI):
MOB-APPLY mob-fr-engine-bench-harness
MOB-APPLY mob-fr-sidecar-primary-poc

# Rollback anytime:
FM_FR_ENGINE=deepface
```

---

## Bottom line

| Priority | Action |
|----------|--------|
| **P0** | `mob-fr-go-ops-freeze-fix` (dispatch unblock) |
| **P1** | **`mob-fr-engine-bench-harness`** — start port with data |
| **P2** | `mob-fr-grade-tiered-alert` — suspect ≠ blacklist |
| **P3** | Enroll/crop MOBs + re-enroll after engine winner |

DeepFace was **lab scaffolding**. You are correct to push **port soon** — that is the real path off “toy”.
