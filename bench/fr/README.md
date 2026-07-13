# FR engine bench (mob-fr-engine-bench-harness)

**Purpose:** Compare **DeepFace (backup)** vs **primary candidates** on *your* BWC stills.  
**Does not** change live Fleet / PTT / SOS. Script only.

## Folder layout (you fill images)

```
bench/fr/
  enroll/           # mugshots — one identity per subfolder OR identity.jpg
    alice/a1.jpg
    bob/b1.jpg
  bwc-front/        # walking BWC, roughly frontal — name: alice_001.jpg or alice/…
  bwc-side/         # ≥30° yaw (mandatory for pass bar)
  bwc-motion/       # blur / stride
  out/              # CSV + summary (gitignored)
```

**Identity rule:** probe filename or parent folder must start with the same id as enroll (`alice_walk01.jpg` → `alice`).

## Run (lab)

```bat
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
.\scripts\fr-bench\RUN-FR-ENGINE-BENCH.bat
```

Or:

```bat
fr-sidecar\.venv\Scripts\python.exe scripts\fr-bench\run_fr_engine_bench.py
```

Optional ONNX candidate (install once in the same venv):

```bat
fr-sidecar\.venv\Scripts\pip install onnxruntime insightface
```

SeetaFace6 is listed in the report as **skipped** until a Windows DLL pack is ready (no fail).

## Pass bar (gate for 2nd sidecar)

- Primary candidate **≥2× faster** than DeepFace baseline on batch timing  
- `bwc-side/` detect rate **≥80%** (tune if set is tiny)  
- Same-person score p50 stable vs DeepFace (document in summary)

Then: `MOB-APPLY mob-fr-sidecar-primary-poc` with the winner.
