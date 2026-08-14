"""
Train RF-DETR Nano pistol smoke on lab COCO (CPU/GPU).
Apache-2.0. Writes checkpoint under weapon-sidecar/models/.
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

from rfdetr import RFDETRNano

ROOT = Path(__file__).resolve().parents[1]  # weapon-sidecar
ME8 = ROOT.parent
DATA = ME8 / "weapon-finetune-dataset" / "coco_pistol_smoke"
OUT = ROOT / "finetune-out" / "pistol-smoke"
MODELS = ROOT / "models"
THREAT = MODELS / "checkpoint_best_total.pth"
DEST = MODELS / "checkpoint_pistol_smoke.pth"


def _copy_best() -> Path:
    candidates = [
        OUT / "checkpoint_best_total.pth",
        OUT / "checkpoint_best_ema.pth",
        OUT / "checkpoint_best_regular.pth",
        OUT / "checkpoint.pth",
    ]
    for c in candidates:
        if c.is_file():
            shutil.copy2(c, DEST)
            return c
    pts = sorted(OUT.rglob("*.pth"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not pts:
        raise SystemExit(f"No .pth produced under {OUT}")
    shutil.copy2(pts[0], DEST)
    return pts[0]


def _break_inference_tensors(module) -> None:
    """Torch 2.x: tensors created under inference_mode cannot autograd."""
    import torch
    for p in module.parameters():
        try:
            if hasattr(p, "is_inference") and p.is_inference():
                p.data = p.data.clone()
        except Exception:
            pass
    for b in module.buffers():
        try:
            if torch.is_tensor(b) and hasattr(b, "is_inference") and b.is_inference():
                b.copy_(b.clone())
        except Exception:
            pass


def run_train(device: str) -> None:
    if not (DATA / "train" / "_annotations.coco.json").is_file():
        raise SystemExit(f"Missing COCO train annotations under {DATA}")

    OUT.mkdir(parents=True, exist_ok=True)
    MODELS.mkdir(parents=True, exist_ok=True)

    # Pistol smoke: 1-class head. Skip Threat 4-class weights (num_classes mismatch +
    # optimize/inference-mode breaks autograd on this lab torch CPU build).
    kwargs = {"num_classes": 1}
    print("init RFDETRNano", kwargs, "device", device)
    model = RFDETRNano(**kwargs)
    try:
        inner = model.model.model if hasattr(model, "model") else model
        _break_inference_tensors(inner)
    except Exception as e:
        print("break_inference skip", e)

    train_kw = dict(
        dataset_dir=str(DATA),
        epochs=6,
        batch_size=1,
        grad_accum_steps=4,
        lr=1e-4,
        output_dir=str(OUT),
        device=device,
        num_workers=0,
        # rfdetr engine.py resizes under torch.inference_mode() when multi_scale=True —
        # those tensors cannot backward on torch 2.x CPU. Smoke: fixed resolution.
        multi_scale=False,
    )
    # Disable AMP on CPU — GradScaler + inference tensors break backward on torch 2.13 CPU
    try:
        model.train(**train_kw, amp=False)
    except TypeError:
        model.train(**train_kw)
    found = _copy_best()
    note = {
        "copied_from": str(found),
        "dest": str(DEST),
        "num_classes": 1,
        "class_map": {"1": "gun"},
        "epochs": 6,
        "device": device,
        "dataset": str(DATA),
        "negatives": 0,
        "warning": "pistol-smoke only; auto-boxes; test on DIFFERENT videos; knife not in this head",
    }
    (MODELS / "checkpoint_pistol_smoke.meta.json").write_text(
        json.dumps(note, indent=2), encoding="utf-8"
    )
    print("WROTE", DEST)
    print(json.dumps(note, indent=2))


def main() -> None:
    # Prefer CPU on this lab box (no CUDA). Explicit cpu avoids failed cuda init.
    device = "cpu"
    try:
        import torch
        if torch.cuda.is_available():
            device = "cuda"
    except Exception:
        device = "cpu"
    run_train(device)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("TRAIN FAIL", e, file=sys.stderr)
        raise
