# MOB DISC — Engine cutover (onnx code default)

**Status:** **APPLIED 2026-07-13** — `mob-fr-engine-cutover`  
**Trigger:** Operator: snap PASS, match still FAIL; still request cutover  
**Honest:** Lab already had `FM_FR_ENGINE=onnx`. Cutover changes **code/ship default** when env unset. It does **not** by itself fix failed matching (enroll quality / threshold / probe domain).

---

## What changed

| File | Change |
|------|--------|
| `lib/frSidecarClient.js` | `FM_FR_ENGINE` unset → **`onnx`** (was `deepface`) |
| `.env.example` / `.env.me8.example` | Document onnx default + deepface rollback |
| `fr-sidecar-fast/README.md` | Cutover status |

## Rollback

```
FM_FR_ENGINE=deepface
```

Then restart Fleet. DeepFace gallery dims ≠ ONNX — re-embed or restore DeepFace index backup if you roll back with an ONNX gallery.

## Checkpoint

Platform health → engine **onnx** · FR watch still works for snaps · match may still need enroll/threshold work.
