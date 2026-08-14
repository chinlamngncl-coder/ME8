"""
================================================================================
CLOUD / GPU TRAINING ONLY — DO NOT RUN ON THE LAB CPU BOX
================================================================================
Run this script in Google Colab, RunPod, Lambda, or any NVIDIA CUDA environment.

Lab hardware (Intel i9, 32GB RAM, no NVIDIA GPU) is for INFERENCE only —
see ai_engine/main.py (CPU-forced FastAPI).

Required env:
  ROBOFLOW_API_KEY          — Roboflow private API key
  ROBOFLOW_WORKSPACE        — workspace slug (optional if set below)
  ROBOFLOW_PROJECT          — project slug
  ROBOFLOW_VERSION          — dataset version number (int)

Optional env:
  RFDETR_EPOCHS             — default 50
  RFDETR_BATCH_SIZE         — default 4
  RFDETR_NUM_CLASSES        — default 1 (weapon)
  RFDETR_OUTPUT_DIR         — default ./ai_engine/finetune-out

Writes:  ai_engine/weights/weapon_rfdetr_best.pt  then exits (auto-close).
================================================================================
"""
from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
HERE = Path.cwd()
WEIGHTS_DIR = HERE / "weights"
OUT_DIR = Path(os.environ.get("RFDETR_OUTPUT_DIR") or str(HERE / "finetune-out"))
BEST_PT = WEIGHTS_DIR / "weapon_rfdetr_best.pt"


def _require_cuda() -> str:
    import torch

    if not torch.cuda.is_available():
        print(
            "[!] No CUDA device. This train.py is for Colab / cloud GPU only.\n"
            "    Lab CPU inference uses: python -m uvicorn ai_engine.main:app …",
            file=sys.stderr,
        )
        sys.exit(2)
    print(f"[*] CUDA OK: {torch.cuda.get_device_name(0)}")
    return "cuda"


def _download_roboflow_coco() -> Path:
    key = (os.environ.get("ROBOFLOW_API_KEY") or "").strip()
    if not key:
        print("[!] Set ROBOFLOW_API_KEY", file=sys.stderr)
        sys.exit(2)

    workspace = (os.environ.get("ROBOFLOW_WORKSPACE") or "").strip()
    project = (os.environ.get("ROBOFLOW_PROJECT") or "").strip()
    version_raw = (os.environ.get("ROBOFLOW_VERSION") or "").strip()
    if not workspace or not project or not version_raw:
        print(
            "[!] Set ROBOFLOW_WORKSPACE, ROBOFLOW_PROJECT, ROBOFLOW_VERSION",
            file=sys.stderr,
        )
        sys.exit(2)

    from roboflow import Roboflow

    print("[*] Downloading Roboflow dataset (COCO)…")
    rf = Roboflow(api_key=key)
    proj = rf.workspace(workspace).project(project)
    ds = proj.version(int(version_raw)).download("coco")
    root = Path(ds.location)
    print(f"[+] Dataset at: {root}")
    return root


def _copy_best_to_pt(out_dir: Path, dest: Path) -> Path:
    candidates = [
        out_dir / "checkpoint_best_total.pth",
        out_dir / "checkpoint_best_ema.pth",
        out_dir / "checkpoint_best_regular.pth",
        out_dir / "checkpoint.pth",
    ]
    src = None
    for c in candidates:
        if c.is_file() and c.stat().st_size > 100000:
            src = c
            break
    if src is None:
        pts = sorted(out_dir.rglob("*.pth"), key=lambda p: p.stat().st_mtime, reverse=True)
        if not pts:
            raise SystemExit(f"No .pth produced under {out_dir}")
        src = pts[0]
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)
    print(f"[+] Copied {src.name} -> {dest}")
    return dest


def main() -> None:
    device = _require_cuda()
    dataset_dir = _download_roboflow_coco()

    epochs = int(os.environ.get("RFDETR_EPOCHS") or "50")
    batch_size = int(os.environ.get("RFDETR_BATCH_SIZE") or "4")
    num_classes = int(os.environ.get("RFDETR_NUM_CLASSES") or "1")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)

    from rfdetr import RFDETRNano

    print(f"[*] Init RFDETRNano num_classes={num_classes} device={device}")
    model = RFDETRNano(num_classes=num_classes, device=device)

    train_kw = dict(
        dataset_dir=str(dataset_dir),
        epochs=epochs,
        batch_size=batch_size,
        grad_accum_steps=max(1, 8 // max(1, batch_size)),
        lr=1e-4,
        output_dir=str(OUT_DIR),
        device=device,
    )
    print("[*] Start RF-DETR training loop…")
    try:
        model.train(**train_kw, amp=True)
    except TypeError:
        model.train(**train_kw)

    _copy_best_to_pt(OUT_DIR, BEST_PT)
    print(f"[*] DONE. Weights: {BEST_PT}")
    print("[*] Auto-close.")
    sys.exit(0)


if __name__ == "__main__":
    main()
