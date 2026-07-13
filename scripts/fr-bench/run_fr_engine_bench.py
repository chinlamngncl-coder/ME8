#!/usr/bin/env python3
"""
mob-fr-engine-bench-harness — offline FR engine comparison (script only).

Compares DeepFace backup path vs optional ONNX (InsightFace) on bench/fr images.
Does not start Fleet, does not modify fr-sidecar/app.py, does not touch live/PTT/SOS.

Usage (from ME8 root):
  fr-sidecar\\.venv\\Scripts\\python.exe scripts\\fr-bench\\run_fr_engine_bench.py
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import os
import statistics
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Optional

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

# ME8 root = parents[2] from scripts/fr-bench/thisfile.py
ROOT = Path(__file__).resolve().parents[2]
DEFAULT_BENCH = ROOT / "bench" / "fr"
OUT_DIR_NAME = "out"

PROBE_FOLDERS = ("bwc-front", "bwc-side", "bwc-motion")


def _identity_from_path(path: Path, folder: Path) -> str:
    """enroll/alice/x.jpg → alice; enroll/alice.jpg → alice; probe alice_001.jpg → alice."""
    try:
        rel = path.relative_to(folder)
    except ValueError:
        rel = Path(path.name)
    parts = rel.parts
    if len(parts) >= 2:
        return parts[0].strip().lower()
    stem = path.stem
    if "_" in stem:
        return stem.split("_", 1)[0].strip().lower()
    return stem.strip().lower()


def _list_images(folder: Path) -> list[Path]:
    if not folder.is_dir():
        return []
    out: list[Path] = []
    for p in sorted(folder.rglob("*")):
        if p.is_file() and p.suffix.lower() in IMAGE_EXT:
            out.append(p)
    return out


def _l2_normalize(vec: list[float]) -> list[float]:
    s = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / s for x in vec]


def _cosine_pct(a: list[float], b: list[float]) -> float:
    """L2-normalized cosine similarity as 0–100 (same spirit as Node matchProbe)."""
    if not a or not b or len(a) != len(b):
        return float("nan")
    an = _l2_normalize(a)
    bn = _l2_normalize(b)
    dot = sum(x * y for x, y in zip(an, bn))
    return max(0.0, min(100.0, float(dot) * 100.0))


def _percentile(sorted_vals: list[float], p: float) -> float:
    if not sorted_vals:
        return float("nan")
    if len(sorted_vals) == 1:
        return sorted_vals[0]
    k = (len(sorted_vals) - 1) * (p / 100.0)
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return sorted_vals[int(k)]
    return sorted_vals[f] * (c - k) + sorted_vals[c] * (k - f)


@dataclass
class EmbedResult:
    ok: bool
    engine: str
    detect_ms: float = 0.0
    embed_ms: float = 0.0
    total_ms: float = 0.0
    face_detected: bool = False
    face_width: int = 0
    embedding: Optional[list[float]] = None
    error: str = ""


@dataclass
class EngineAdapter:
    name: str
    role: str
    available: bool
    skip_reason: str = ""
    embed_fn: Optional[Callable[[str], EmbedResult]] = None
    warm_fn: Optional[Callable[[], None]] = field(default=None, repr=False)


def _make_deepface(detector: str, model_name: str, label: str, role: str) -> EngineAdapter:
    try:
        from deepface import DeepFace  # noqa: F401
    except Exception as exc:  # noqa: BLE001
        return EngineAdapter(
            name=label,
            role=role,
            available=False,
            skip_reason=f"deepface import failed: {exc}",
        )

    warmed = {"done": False}

    def warm() -> None:
        if warmed["done"]:
            return
        # tiny warm — skip if no images; first real call pays cold start (logged in CSV)
        warmed["done"] = True

    def embed(path: str) -> EmbedResult:
        from deepface import DeepFace

        t0 = time.perf_counter()
        try:
            t_det0 = time.perf_counter()
            reps = DeepFace.represent(
                img_path=path,
                model_name=model_name,
                detector_backend=detector,
                enforce_detection=True,
                align=True,
            )
            t_det1 = time.perf_counter()
        except ValueError as exc:
            total = (time.perf_counter() - t0) * 1000.0
            return EmbedResult(
                ok=False,
                engine=label,
                total_ms=total,
                detect_ms=total,
                face_detected=False,
                error=f"face_not_detected:{str(exc)[:120]}",
            )
        except Exception as exc:  # noqa: BLE001
            total = (time.perf_counter() - t0) * 1000.0
            return EmbedResult(
                ok=False,
                engine=label,
                total_ms=total,
                error=f"represent_failed:{str(exc)[:160]}",
            )

        total = (time.perf_counter() - t0) * 1000.0
        # DeepFace does not split detect/embed — attribute most to embed after first face found
        detect_ms = (t_det1 - t_det0) * 1000.0 * 0.35
        embed_ms = max(0.0, total - detect_ms)
        if not reps or not isinstance(reps, list):
            return EmbedResult(
                ok=False,
                engine=label,
                total_ms=total,
                detect_ms=detect_ms,
                embed_ms=embed_ms,
                error="face_not_detected",
            )
        best = max(reps, key=lambda r: float((r or {}).get("face_confidence") or 0))
        area = (best or {}).get("facial_area") or {}
        fw = int(area.get("w") or area.get("width") or 0)
        emb = best.get("embedding")
        try:
            emb_list = [float(x) for x in list(emb)]
        except (TypeError, ValueError):
            return EmbedResult(
                ok=False,
                engine=label,
                total_ms=total,
                detect_ms=detect_ms,
                embed_ms=embed_ms,
                face_detected=True,
                face_width=fw,
                error="bad_embedding",
            )
        return EmbedResult(
            ok=True,
            engine=label,
            detect_ms=detect_ms,
            embed_ms=embed_ms,
            total_ms=total,
            face_detected=True,
            face_width=fw,
            embedding=emb_list,
        )

    return EngineAdapter(
        name=label,
        role=role,
        available=True,
        embed_fn=embed,
        warm_fn=warm,
    )


def _make_insightface_onnx(label: str = "onnx_buffalo_sc") -> EngineAdapter:
    try:
        from insightface.app import FaceAnalysis  # type: ignore
        import numpy as np  # noqa: F401
        import cv2  # noqa: F401
    except Exception as exc:  # noqa: BLE001
        return EngineAdapter(
            name=label,
            role="primary_candidate",
            available=False,
            skip_reason=(
                "insightface/onnxruntime not installed — "
                f"pip install onnxruntime insightface ({exc})"
            ),
        )

    state: dict[str, Any] = {"app": None}

    def warm() -> None:
        if state["app"] is not None:
            return
        app = FaceAnalysis(
            name="buffalo_sc",
            providers=["CPUExecutionProvider"],
        )
        app.prepare(ctx_id=-1, det_size=(640, 640))
        state["app"] = app

    def embed(path: str) -> EmbedResult:
        import cv2

        warm()
        app = state["app"]
        t0 = time.perf_counter()
        img = cv2.imread(path)
        if img is None:
            return EmbedResult(ok=False, engine=label, error="imread_failed")
        t_det0 = time.perf_counter()
        faces = app.get(img)
        t_det1 = time.perf_counter()
        total = (time.perf_counter() - t0) * 1000.0
        detect_ms = (t_det1 - t_det0) * 1000.0
        if not faces:
            return EmbedResult(
                ok=False,
                engine=label,
                total_ms=total,
                detect_ms=detect_ms,
                face_detected=False,
                error="face_not_detected",
            )
        face = max(faces, key=lambda f: float((f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1])))
        emb = face.normed_embedding
        if emb is None:
            emb = face.embedding
        try:
            emb_list = [float(x) for x in list(emb)]
        except (TypeError, ValueError):
            return EmbedResult(
                ok=False,
                engine=label,
                total_ms=total,
                detect_ms=detect_ms,
                face_detected=True,
                error="bad_embedding",
            )
        fw = int(face.bbox[2] - face.bbox[0])
        embed_ms = max(0.0, total - detect_ms)
        return EmbedResult(
            ok=True,
            engine=label,
            detect_ms=detect_ms,
            embed_ms=embed_ms,
            total_ms=total,
            face_detected=True,
            face_width=fw,
            embedding=emb_list,
        )

    return EngineAdapter(
        name=label,
        role="primary_candidate",
        available=True,
        embed_fn=embed,
        warm_fn=warm,
    )


def _make_seeta_stub() -> EngineAdapter:
    return EngineAdapter(
        name="seetaface6_mobile",
        role="primary_candidate",
        available=False,
        skip_reason="SeetaFace6 Windows DLL pack not wired yet — skip until sidecar POC",
    )


def collect_enroll(enroll_dir: Path) -> dict[str, list[Path]]:
    by_id: dict[str, list[Path]] = {}
    for p in _list_images(enroll_dir):
        iid = _identity_from_path(p, enroll_dir)
        by_id.setdefault(iid, []).append(p)
    return by_id


def collect_probes(bench_dir: Path) -> list[tuple[str, str, Path]]:
    """Return list of (folder_name, identity, path)."""
    rows: list[tuple[str, str, Path]] = []
    for name in PROBE_FOLDERS:
        folder = bench_dir / name
        for p in _list_images(folder):
            rows.append((name, _identity_from_path(p, folder), p))
    return rows


def run_bench(bench_dir: Path, out_dir: Path, engines: list[EngineAdapter]) -> dict[str, Any]:
    enroll_map = collect_enroll(bench_dir / "enroll")
    probes = collect_probes(bench_dir)

    if not enroll_map:
        raise SystemExit(
            f"No enroll images under {bench_dir / 'enroll'}. See bench/fr/README.md"
        )
    if not probes:
        raise SystemExit(
            f"No probe images under bwc-front / bwc-side / bwc-motion. See bench/fr/README.md"
        )

    out_dir.mkdir(parents=True, exist_ok=True)
    csv_path = out_dir / "fr_engine_bench.csv"
    summary_path = out_dir / "fr_engine_bench_summary.json"

    available = [e for e in engines if e.available and e.embed_fn]
    skipped = [{"engine": e.name, "role": e.role, "reason": e.skip_reason} for e in engines if not e.available]

    print(f"Enroll identities: {len(enroll_map)} → {', '.join(sorted(enroll_map))}")
    print(f"Probe images: {len(probes)}")
    print(f"Engines: {[e.name for e in available]}")
    for s in skipped:
        print(f"  skip {s['engine']}: {s['reason']}")

    # Warm engines once
    for e in available:
        if e.warm_fn:
            try:
                print(f"Warming {e.name}…")
                e.warm_fn()
            except Exception as exc:  # noqa: BLE001
                print(f"  warm failed {e.name}: {exc}")
                e.available = False
                e.skip_reason = f"warm failed: {exc}"
                e.embed_fn = None

    available = [e for e in engines if e.available and e.embed_fn]

    # Embed enroll (first image per identity per engine)
    gallery: dict[str, dict[str, list[float]]] = {e.name: {} for e in available}
    for e in available:
        assert e.embed_fn
        for iid, paths in sorted(enroll_map.items()):
            r = e.embed_fn(str(paths[0]))
            if r.ok and r.embedding:
                gallery[e.name][iid] = r.embedding
                print(f"  gallery {e.name}/{iid}: ok ({r.total_ms:.0f} ms)")
            else:
                print(f"  gallery {e.name}/{iid}: FAIL {r.error}")

    fieldnames = [
        "engine",
        "role",
        "folder",
        "identity",
        "image",
        "faceDetected",
        "faceWidth",
        "detectMs",
        "embedMs",
        "totalMs",
        "samePersonScore",
        "bestImpostorScore",
        "error",
    ]
    rows_out: list[dict[str, Any]] = []

    for e in available:
        assert e.embed_fn
        for folder, iid, path in probes:
            r = e.embed_fn(str(path))
            same = float("nan")
            impostor = float("nan")
            if r.ok and r.embedding and e.name in gallery:
                gal = gallery[e.name]
                if iid in gal:
                    same = _cosine_pct(r.embedding, gal[iid])
                others = [_cosine_pct(r.embedding, gal[o]) for o in gal if o != iid]
                others = [x for x in others if not math.isnan(x)]
                if others:
                    impostor = max(others)
            rows_out.append(
                {
                    "engine": e.name,
                    "role": e.role,
                    "folder": folder,
                    "identity": iid,
                    "image": str(path.relative_to(bench_dir)).replace("\\", "/"),
                    "faceDetected": int(bool(r.face_detected or r.ok)),
                    "faceWidth": r.face_width,
                    "detectMs": round(r.detect_ms, 2),
                    "embedMs": round(r.embed_ms, 2),
                    "totalMs": round(r.total_ms, 2),
                    "samePersonScore": "" if math.isnan(same) else round(same, 2),
                    "bestImpostorScore": "" if math.isnan(impostor) else round(impostor, 2),
                    "error": r.error,
                }
            )
            status = "ok" if r.ok else r.error
            print(f"{e.name} {folder}/{path.name}: {status} {r.total_ms:.0f}ms same={same if not math.isnan(same) else '-'}")

    with csv_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows_out)

    # Summary per engine
    summary: dict[str, Any] = {
        "benchDir": str(bench_dir),
        "csv": str(csv_path),
        "identities": sorted(enroll_map.keys()),
        "probeCount": len(probes),
        "skipped": skipped,
        "engines": {},
        "passBar": {
            "primaryVsDeepfaceSpeedMin": 2.0,
            "sideDetectRateMin": 0.80,
            "note": "Green-light mob-fr-sidecar-primary-poc when a primary_candidate clears speed + side detect vs deepface_facenet_opencv",
        },
    }

    baseline_name = "deepface_facenet_opencv"
    baseline_median_total: Optional[float] = None

    for e in available:
        erows = [r for r in rows_out if r["engine"] == e.name]
        totals = [float(r["totalMs"]) for r in erows]
        totals_sorted = sorted(totals)
        side = [r for r in erows if r["folder"] == "bwc-side"]
        side_det = sum(1 for r in side if int(r["faceDetected"]) == 1)
        side_rate = (side_det / len(side)) if side else float("nan")
        same_scores = [
            float(r["samePersonScore"])
            for r in erows
            if r["samePersonScore"] != "" and not math.isnan(float(r["samePersonScore"]))
        ]
        same_sorted = sorted(same_scores)
        impostors = [
            float(r["bestImpostorScore"])
            for r in erows
            if r["bestImpostorScore"] != "" and not math.isnan(float(r["bestImpostorScore"]))
        ]
        impostors_sorted = sorted(impostors)
        med_total = statistics.median(totals) if totals else float("nan")
        if e.name == baseline_name:
            baseline_median_total = med_total
        summary["engines"][e.name] = {
            "role": e.role,
            "n": len(erows),
            "detectRate": (sum(1 for r in erows if int(r["faceDetected"]) == 1) / len(erows)) if erows else 0,
            "sideDetectRate": side_rate,
            "sideN": len(side),
            "totalMs_p50": med_total,
            "totalMs_p95": _percentile(totals_sorted, 95) if totals_sorted else float("nan"),
            "samePersonScore_p50": _percentile(same_sorted, 50) if same_sorted else float("nan"),
            "samePersonScore_p95": _percentile(same_sorted, 95) if same_sorted else float("nan"),
            "impostorScore_p95": _percentile(impostors_sorted, 95) if impostors_sorted else float("nan"),
            "samePersonN": len(same_scores),
        }

    # Speed vs baseline
    if baseline_median_total and baseline_median_total > 0:
        for name, st in summary["engines"].items():
            if name == baseline_name:
                st["speedupVsDeepface"] = 1.0
                continue
            p50 = st.get("totalMs_p50")
            if p50 and p50 > 0:
                st["speedupVsDeepface"] = round(baseline_median_total / p50, 2)
            else:
                st["speedupVsDeepface"] = None
            role = st.get("role")
            speed = st.get("speedupVsDeepface") or 0
            side_r = st.get("sideDetectRate")
            st["clearsPassBar"] = bool(
                role == "primary_candidate"
                and speed >= 2.0
                and (isinstance(side_r, float) and not math.isnan(side_r) and side_r >= 0.80)
            )

    def _jsonable(obj: Any) -> Any:
        if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
            return None
        if isinstance(obj, dict):
            return {k: _jsonable(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [_jsonable(v) for v in obj]
        return obj

    with summary_path.open("w", encoding="utf-8") as f:
        json.dump(_jsonable(summary), f, indent=2)

    print("")
    print(f"CSV:     {csv_path}")
    print(f"Summary: {summary_path}")
    for name, st in summary["engines"].items():
        print(
            f"  {name}: p50={st['totalMs_p50']:.0f}ms "
            f"sideDetect={st['sideDetectRate']} "
            f"speedup={st.get('speedupVsDeepface')} "
            f"pass={st.get('clearsPassBar', False)}"
        )
    return summary


def main() -> int:
    ap = argparse.ArgumentParser(description="mob-fr-engine-bench-harness")
    ap.add_argument(
        "--bench-dir",
        type=Path,
        default=DEFAULT_BENCH,
        help="Path to bench/fr (enroll + bwc-* folders)",
    )
    ap.add_argument(
        "--skip-onnx",
        action="store_true",
        help="Do not try InsightFace ONNX candidate",
    )
    ap.add_argument(
        "--skip-retina",
        action="store_true",
        help="Skip DeepFace+retinaface upper-bound engine",
    )
    args = ap.parse_args()
    bench_dir = args.bench_dir.resolve()
    out_dir = bench_dir / OUT_DIR_NAME

    engines: list[EngineAdapter] = [
        _make_deepface("opencv", "Facenet", "deepface_facenet_opencv", "baseline_backup"),
    ]
    if not args.skip_retina:
        engines.append(
            _make_deepface("retinaface", "Facenet", "deepface_facenet_retinaface", "detect_upper_bound")
        )
    if not args.skip_onnx:
        engines.append(_make_insightface_onnx())
    engines.append(_make_seeta_stub())

    try:
        run_bench(bench_dir, out_dir, engines)
    except SystemExit as exc:
        print(str(exc) or "exit", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
