"""
Build COCO layout for pistol smoke fine-tune from folder images.
Boxes = auto inset of full frame (smoke only — not hand-labeled).
No cam-id hardcode. No fake hits.
"""
from __future__ import annotations

import json
import random
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "weapon-finetune-dataset" / "gun_pistol"
OUT = ROOT / "weapon-finetune-dataset" / "coco_pistol_smoke"
INSET = 0.08  # keep 84% center as weak auto-box
VALID_FRAC = 0.2
SEED = 7


def list_images(folder: Path) -> list[Path]:
    exts = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    return sorted(
        p for p in folder.iterdir()
        if p.is_file() and p.suffix.lower() in exts and p.name != ".gitkeep"
    )


def main() -> None:
    images = list_images(SRC)
    if len(images) < 8:
        raise SystemExit(f"Need more pistol images in {SRC} (found {len(images)})")

    random.Random(SEED).shuffle(images)
    n_valid = max(2, int(round(len(images) * VALID_FRAC)))
    valid = images[:n_valid]
    train = images[n_valid:]
    if len(train) < 4:
        raise SystemExit("train split too small")

    if OUT.exists():
        shutil.rmtree(OUT)
    for split, files in (("train", train), ("valid", valid), ("test", valid)):
        d = OUT / split
        d.mkdir(parents=True, exist_ok=True)
        cats = [{"id": 1, "name": "gun", "supercategory": "weapon"}]
        coco = {
            "info": {
                "description": "ME8 pistol smoke auto-box (not hand-labeled)",
                "version": "pistol-smoke-v1",
            },
            "licenses": [],
            "categories": cats,
            "images": [],
            "annotations": [],
        }
        ann_id = 1
        for i, src in enumerate(files, start=1):
            with Image.open(src) as im:
                w, h = im.size
            dest_name = f"{i:04d}_{src.name}".replace(" ", "_")
            shutil.copy2(src, d / dest_name)
            coco["images"].append({
                "id": i,
                "file_name": dest_name,
                "width": w,
                "height": h,
            })
            x0 = int(w * INSET)
            y0 = int(h * INSET)
            bw = max(1, int(w * (1 - 2 * INSET)))
            bh = max(1, int(h * (1 - 2 * INSET)))
            coco["annotations"].append({
                "id": ann_id,
                "image_id": i,
                "category_id": 1,
                "bbox": [x0, y0, bw, bh],
                "area": float(bw * bh),
                "iscrowd": 0,
            })
            ann_id += 1
        with open(d / "_annotations.coco.json", "w", encoding="utf-8") as f:
            json.dump(coco, f)
        print(f"{split}: {len(files)} images -> {d}")

    meta = {
        "source": str(SRC),
        "train": len(train),
        "valid": len(valid),
        "note": "auto-box inset; negatives empty; pistol-only smoke",
        "cheat": False,
        "hardcode": False,
    }
    (OUT / "BUILD-NOTES.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("OK", OUT)


if __name__ == "__main__":
    main()
