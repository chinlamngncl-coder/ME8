# FR primary sidecar — ONNX / InsightFace

**MOB:** `mob-fr-sidecar-primary-poc` · cutover · **`mob-fr-onnx-pack-off` (APPLIED)**  
**Engine default:** **onnx** (`fr-sidecar-fast/`, port **8766**).  
**Lab pack:** **`buffalo_sc`** (heavy `buffalo_l` removed — pack chasing parked).  
**Next quality path:** **SeetaFace6** (`FM_FR_ENGINE=seeta` reserved — not DeepFace).  
**Backup engine only:** `FM_FR_ENGINE=deepface` if you explicitly need it.

## Operator / IT

Customers do **not** start this by hand. With `FM_FR_SIDECAR_AUTO=1`, Fleet starts the active engine.

## Lab

```
FM_FR_ENGINE=onnx
FM_FR_ONNX_PACK=buffalo_sc
FM_FR_SIDECAR_AUTO=1
```

After any pack change: Watchlist → **Re-embed gallery**.

## Legal

InsightFace **code** = MIT. Pretrained buffalo packs = **non-commercial research** unless commercially licensed.  
Customer ship FR → **Seeta open** or paid InsightFace model license — not “ship buffalo quietly.”

See `docs/MOB-DISC-FR-ONNX-PACK-COMMERCIAL-LICENSE.md` and `docs/MOB-DISC-FR-INSIGHTFACE-PACK-OFF-SEETA-PATH.md`.
