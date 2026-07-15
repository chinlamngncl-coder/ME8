# MOB DISC — Lab enable ONNX FR engine

**Status:** **APPLIED** 2026-07-13 — `mob-fr-engine-lab-enable-onnx`  
**Trigger:** DeepFace too slow / weak match for walking BWC; ONNX sidecar POC already built  
**Search:** FM_FR_ENGINE=onnx, fr-sidecar-fast, lab enable, re-enroll  

---

## What this MOB does

| Item | Action |
|------|--------|
| Lab `.env` | `FM_FR_ENGINE=onnx`, port **8766**, `FM_FR_FAST_PY`, pack `buffalo_sc` |
| Code default | **Unchanged** — still DeepFace until `mob-fr-engine-cutover` |
| Install | `fr-sidecar-fast/.venv` already present (InsightFace + onnxruntime OK) |
| DeepFace | Remains on **8765**; rollback = `FM_FR_ENGINE=deepface` |

**Not changed:** live wall, PTT, SOS, ZLM, `fleet-ui.js` / `video-wall.js`.

---

## Operator steps after APPLY

1. `RESTART-FLEET.bat` (or service restart) so Node picks up `.env`
2. Confirm FR health shows `engine: onnx` (port 8766)
3. **Re-enroll** every watchlist face (embedding dim ≠ DeepFace) — old gallery rows will not match
4. Walk-test BWC face watch; compare snap latency vs DeepFace

## Rollback

```
FM_FR_ENGINE=deepface
```

Restart Fleet. DeepFace gallery may still be usable if you did not delete enroll photos.

## Next (separate)

| MOB | Purpose |
|-----|---------|
| `mob-fr-gallery-re-enroll-migrate` | Bulk re-embed without manual per-face (optional) |
| `mob-fr-probe-side-face-gate` | Side-face / quality gate for walking BWC |
| `mob-fr-engine-cutover` | Make onnx the **code** default for ship packs |

---

## PASS check

1. After restart, sidecar on **8766**, health `engine: onnx`
2. New enroll → live probe can score (same person)
3. Snap path feels faster than DeepFace lab baseline
4. `FM_FR_ENGINE=deepface` still starts **8765** backup
