"""
ANPR-PLATE-YOLO-PACK-AND-READ-V1 — plate detector via ONNX (preferred) or Ultralytics .pt.
Avoids importing torch by default so Windows PaddleOCR stays healthy.
"""
from __future__ import annotations

import os
from typing import Any, Optional

import cv2
import numpy as np

_engine = None
_engine_error: Optional[str] = None
_engine_kind: Optional[str] = None
_stage2_engine = None
_stage2_error: Optional[str] = None
_stage2_kind: Optional[str] = None
_stage2_load_attempted = False
_stage2_disabled = False  # ANPR-STAGE2-SAFE-FALLBACK-V1 — never retry crash loop
_s2_rgb_peak_conf = 0.0
_s2_rgb_samples = 0
_s2_crop_model_swapped = False


def crop_plate_fallback_weights_path() -> str:
    return os.path.join(models_dir(), "yolov8n-license-plate-keremberke.pt")


def download_crop_plate_model() -> Optional[str]:
    """keremberke yolov8n-license-plate — plate-in-crop weights when ph_id stays weak."""
    dest = crop_plate_fallback_weights_path()
    if os.path.isfile(dest) and os.path.getsize(dest) > 1_000_000:
        return dest
    os.makedirs(models_dir(), exist_ok=True)
    urls = [
        # Public YOLOv8n plate (trained on keremberke license-plate dataset)
        "https://huggingface.co/joker5914/yolov8n-license-plate/resolve/main/best.pt",
        "https://huggingface.co/joker5914/yolov8n-license-plate/resolve/main/best.onnx",
    ]
    import urllib.request

    for url in urls:
        tmp = dest + ".tmp"
        try:
            print("[anpr-stage2] downloading crop-plate model:", url, flush=True)
            urllib.request.urlretrieve(url, tmp)
            if os.path.isfile(tmp) and os.path.getsize(tmp) > 500_000:
                if os.path.isfile(dest):
                    try:
                        os.remove(dest)
                    except OSError:
                        pass
                os.replace(tmp, dest)
                print("[anpr-stage2] crop-plate model saved:", dest, flush=True)
                return dest
        except Exception as exc:  # noqa: BLE001
            print("[anpr-stage2] download fail:", url, str(exc)[:120], flush=True)
            try:
                if os.path.isfile(tmp):
                    os.remove(tmp)
            except OSError:
                pass
    return None


def _maybe_swap_to_crop_plate_model(max_conf: float) -> None:
    """If forced-RGB peak stays < 0.10 after N crops, swap to crop-trained plate weights."""
    global _s2_rgb_peak_conf, _s2_rgb_samples, _s2_crop_model_swapped
    global _stage2_engine, _stage2_kind, _stage2_error
    _s2_rgb_samples += 1
    if max_conf > _s2_rgb_peak_conf:
        _s2_rgb_peak_conf = float(max_conf)
    if _s2_crop_model_swapped:
        return
    need = max(5, int(os.environ.get("FM_ANPR_STAGE2_FALLBACK_AFTER", "5") or "5"))
    if _s2_rgb_samples < need:
        return
    if _s2_rgb_peak_conf >= 0.10:
        return
    print(
        f"[anpr-stage2] RGB peak max_conf={_s2_rgb_peak_conf:.4f} < 0.10 after "
        f"{_s2_rgb_samples} crops — swapping to crop-plate model",
        flush=True,
    )
    path = download_crop_plate_model()
    if not path:
        print("[anpr-stage2] crop-plate download failed — keeping ph_id weights", flush=True)
        _s2_crop_model_swapped = True
        return
    try:
        _stage2_engine = UltralyticsPlateYolo(path)
        _stage2_kind = "ultralytics-crop-plate"
        _stage2_error = None
        _s2_crop_model_swapped = True
        _s2_rgb_peak_conf = 0.0
        _s2_rgb_samples = 0
        print("[anpr-stage2] NOW USING crop-plate weights:", path, flush=True)
    except Exception as exc:  # noqa: BLE001
        print("[anpr-stage2] crop-plate load failed:", str(exc)[:160], flush=True)
        _s2_crop_model_swapped = True


def models_dir() -> str:
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")


def me8_root() -> str:
    """anpr-sidecar/ → ME8 repo root (ai_engine/weights lives here)."""
    return os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))


def ai_engine_weights_dir() -> str:
    return os.path.join(me8_root(), "ai_engine", "weights")


def stage2_plate_weights_path() -> Optional[str]:
    """
    Stage-2 plate localizer (crop-in-crop inside vehicle macro).
    Default: ai_engine/weights/ph_id_plates_best.pt
    """
    override = (
        os.environ.get("FM_ANPR_STAGE2_WEIGHTS")
        or os.environ.get("FM_ANPR_YOLO_WEIGHTS")
        or ""
    ).strip()
    if override and os.path.isfile(override):
        return override
    preferred = os.path.join(ai_engine_weights_dir(), "ph_id_plates_best.pt")
    if os.path.isfile(preferred):
        return preferred
    return None


def plate_weights_paths() -> dict[str, Optional[str]]:
    override = (os.environ.get("FM_ANPR_YOLO_WEIGHTS") or "").strip()
    onnx = None
    pt = None
    if override:
        if override.lower().endswith(".onnx") and os.path.isfile(override):
            onnx = override
        elif os.path.isfile(override):
            pt = override
    # Stage-2 champion weights (ai_engine/weights)
    s2 = stage2_plate_weights_path()
    if s2 and s2.lower().endswith(".onnx"):
        onnx = onnx or s2
    elif s2:
        pt = pt or s2
    md = models_dir()
    for name in ("plate_yolo11n.onnx", "license-plate-finetune-v1n.onnx"):
        p = os.path.join(md, name)
        if os.path.isfile(p):
            onnx = onnx or p
            break
    for name in ("plate_yolo11n.pt", "plate_yolo11s.pt", "yolo11n_plate.pt", "license-plate-finetune-v1n.pt"):
        p = os.path.join(md, name)
        if os.path.isfile(p):
            pt = pt or p
            break
    return {"onnx": onnx, "pt": pt, "stage2": s2, "aiEngineWeights": ai_engine_weights_dir()}


def _letterbox(img_bgr: np.ndarray, size: int = 640) -> tuple[np.ndarray, float, int, int]:
    h, w = img_bgr.shape[:2]
    r = min(size / float(h), size / float(w))
    nh, nw = int(round(h * r)), int(round(w * r))
    resized = cv2.resize(img_bgr, (nw, nh), interpolation=cv2.INTER_LINEAR)
    canvas = np.full((size, size, 3), 114, dtype=np.uint8)
    canvas[:nh, :nw] = resized
    return canvas, r, 0, 0


def _nms_xyxy(boxes: list[list[float]], scores: list[float], iou_thr: float = 0.45) -> list[int]:
    if not boxes:
        return []
    b = np.array(boxes, dtype=np.float32)
    s = np.array(scores, dtype=np.float32)
    x1, y1, x2, y2 = b[:, 0], b[:, 1], b[:, 2], b[:, 3]
    areas = (x2 - x1).clip(min=0) * (y2 - y1).clip(min=0)
    order = s.argsort()[::-1]
    keep: list[int] = []
    while order.size > 0:
        i = int(order[0])
        keep.append(i)
        if order.size == 1:
            break
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])
        inter = (xx2 - xx1).clip(min=0) * (yy2 - yy1).clip(min=0)
        iou = inter / (areas[i] + areas[order[1:]] - inter + 1e-6)
        order = order[1:][iou < iou_thr]
    return keep


class OnnxPlateYolo:
    def __init__(self, path: str):
        import onnxruntime as ort

        self.path = path
        self.sess = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
        self.input_name = self.sess.get_inputs()[0].name
        self.size = 640

    def predict_boxes(self, img_bgr: np.ndarray, conf_thr: float = 0.25) -> list[dict[str, Any]]:
        h0, w0 = img_bgr.shape[:2]
        canvas, r, _pad_x, _pad_y = _letterbox(img_bgr, self.size)
        blob = canvas[:, :, ::-1].transpose(2, 0, 1).astype(np.float32) / 255.0
        blob = np.expand_dims(blob, 0)
        out = self.sess.run(None, {self.input_name: blob})[0]
        pred = out[0]  # (5, N) cx,cy,w,h,conf
        if pred.ndim != 2 or pred.shape[0] < 5:
            return []
        confs = pred[4]
        idxs = np.where(confs >= conf_thr)[0]
        boxes: list[list[float]] = []
        scores: list[float] = []
        for i in idxs:
            cx, cy, bw, bh = float(pred[0, i]), float(pred[1, i]), float(pred[2, i]), float(pred[3, i])
            x0 = (cx - bw / 2.0) / r
            y0 = (cy - bh / 2.0) / r
            x1 = (cx + bw / 2.0) / r
            y1 = (cy + bh / 2.0) / r
            boxes.append([x0, y0, x1, y1])
            scores.append(float(confs[i]))
        keep = _nms_xyxy(boxes, scores)
        out_boxes: list[dict[str, Any]] = []
        for i in keep:
            x0, y0, x1, y1 = boxes[i]
            xa = int(max(0, min(w0 - 1, round(x0))))
            ya = int(max(0, min(h0 - 1, round(y0))))
            xb = int(max(0, min(w0, round(x1))))
            yb = int(max(0, min(h0, round(y1))))
            if xb - xa < 8 or yb - ya < 6:
                continue
            out_boxes.append({"x0": xa, "y0": ya, "x1": xb, "y1": yb, "conf": scores[i]})
        out_boxes.sort(key=lambda b: b["conf"], reverse=True)
        try:
            from vehicle_detect import filter_watermark_deadzone
            from dual_lpr import filter_plate_boxes_geometry

            out_boxes = filter_watermark_deadzone(out_boxes, h0)
            out_boxes = filter_plate_boxes_geometry(out_boxes, vehicle_h=h0)
        except Exception:  # noqa: BLE001
            pass
        return out_boxes


class UltralyticsPlateYolo:
    def __init__(self, path: str):
        from ultralytics import YOLO

        self.path = path
        self.model = YOLO(path)

    def predict_boxes(self, img_bgr: np.ndarray, conf_thr: float = 0.01) -> list[dict[str, Any]]:
        """
        Stage-2: always BGR→RGB via PIL (no Ultralytics double convert).
        Temporary conf=0.01 to measure RGB max_conf lift. No class filter.
        """
        if img_bgr is None or getattr(img_bgr, "size", 0) == 0:
            print("[ANPR-S2-RAW] empty vehicle_crop", flush=True)
            return []
        shape = tuple(int(x) for x in img_bgr.shape)
        print(f"[ANPR-S2-RAW] vehicle_crop.shape={shape}", flush=True)
        imgsz = int(os.environ.get("FM_ANPR_STAGE2_IMGSZ", "640") or "640")
        imgsz = 320 if imgsz <= 320 else 640
        work, scale = _stage2_prepare_input(img_bgr, min_long=320, target_long=imgsz)
        work = _stage2_ensure_bgr_u8(work)
        force_rgb = 1
        crop_rgb = cv2.cvtColor(work, cv2.COLOR_BGR2RGB)
        try:
            from PIL import Image

            infer_img = Image.fromarray(crop_rgb)
        except Exception:
            infer_img = np.ascontiguousarray(crop_rgb)
        keep_thr = float(conf_thr if conf_thr is not None else 0.01)
        keep_thr = max(0.01, min(0.5, keep_thr))
        peek_conf = 0.01
        try:
            results = self.model.predict(
                infer_img,
                verbose=False,
                conf=float(peek_conf),
                imgsz=imgsz,
                classes=None,
            )
        except TypeError:
            results = self.model.predict(
                infer_img, verbose=False, conf=float(peek_conf), imgsz=imgsz
            )
        if not results:
            print(
                f"[ANPR-S2-RAW] crop_shape={shape} raw_n=0 max_conf=none (empty) force_rgb={force_rgb}",
                flush=True,
            )
            _maybe_swap_to_crop_plate_model(0.0)
            return []
        boxes = getattr(results[0], "boxes", None)
        if boxes is None or len(boxes) == 0:
            print(
                f"[ANPR-S2-RAW] crop_shape={shape} raw_n=0 max_conf=none peek={peek_conf} force_rgb={force_rgb}",
                flush=True,
            )
            try:
                from anpr_funnel_log import bump
                bump("s2_plates_raw", 0)
            except Exception:
                pass
            _maybe_swap_to_crop_plate_model(0.0)
            return []
        raw_n = int(len(boxes))
        max_conf = 0.0
        try:
            confs_t = boxes.conf
            if confs_t is not None and len(confs_t):
                max_conf = float(confs_t.max().item())
        except Exception:
            max_conf = 0.0
        print(
            f"[ANPR-S2-RAW] crop_shape={shape} work={tuple(int(x) for x in work.shape)} "
            f"raw_n={raw_n} max_conf={max_conf:.4f} keep>={keep_thr:.2f} "
            f"imgsz={imgsz} force_rgb={force_rgb} rgb_pil=1",
            flush=True,
        )
        _maybe_swap_to_crop_plate_model(max_conf)
        h0, w0 = img_bgr.shape[:2]
        out: list[dict[str, Any]] = []
        for i in range(len(boxes)):
            xyxy = boxes.xyxy[i].tolist()
            conf = float(boxes.conf[i].item()) if boxes.conf is not None else 0.5
            if conf < keep_thr:
                continue
            x0 = float(xyxy[0]) / scale
            y0 = float(xyxy[1]) / scale
            x1 = float(xyxy[2]) / scale
            y1 = float(xyxy[3]) / scale
            xa = int(max(0, min(w0 - 1, round(x0))))
            ya = int(max(0, min(h0 - 1, round(y0))))
            xb = int(max(0, min(w0, round(x1))))
            yb = int(max(0, min(h0, round(y1))))
            if xb - xa < 8 or yb - ya < 6:
                continue
            out.append({"x0": xa, "y0": ya, "x1": xb, "y1": yb, "conf": conf})
        out.sort(key=lambda b: b["conf"], reverse=True)
        kept_n = len(out)
        try:
            from vehicle_detect import filter_watermark_deadzone

            out = filter_watermark_deadzone(out, h0)
            geom_on = (os.environ.get("FM_ANPR_STAGE2_GEOM_FILTER") or "0").strip().lower() in (
                "1", "true", "yes", "on",
            )
            if geom_on:
                from dual_lpr import filter_plate_boxes_geometry

                before = len(out)
                out = filter_plate_boxes_geometry(out, vehicle_h=h0)
                dropped = before - len(out)
                if dropped > 0:
                    try:
                        from anpr_funnel_log import bump
                        bump("s2_geom_drop", dropped)
                    except Exception:
                        pass
        except Exception:  # noqa: BLE001
            pass
        try:
            from anpr_funnel_log import bump
            bump("s2_plates_raw", kept_n)
            print(
                f"[ANPR-FUNNEL] S2_plates_raw={kept_n} (model_raw={raw_n} max_conf={max_conf:.4f}) "
                f"conf>={keep_thr} imgsz={imgsz} force_rgb={force_rgb}",
                flush=True,
            )
        except Exception:
            pass
        return out


def _stage2_ensure_bgr_u8(img: np.ndarray) -> np.ndarray:
    """Contiguous uint8 BGR before explicit BGR→RGB."""
    if img is None or getattr(img, "size", 0) == 0:
        return img
    out = np.ascontiguousarray(img)
    if out.dtype != np.uint8:
        out = np.clip(out, 0, 255).astype(np.uint8)
    if out.ndim == 2:
        out = cv2.cvtColor(out, cv2.COLOR_GRAY2BGR)
    elif out.ndim == 3 and out.shape[2] == 4:
        out = cv2.cvtColor(out, cv2.COLOR_BGRA2BGR)
    elif out.ndim == 3 and out.shape[2] == 1:
        out = cv2.cvtColor(out, cv2.COLOR_GRAY2BGR)
    return np.ascontiguousarray(out)


def _stage2_prepare_input(
    img_bgr: np.ndarray,
    *,
    min_long: int = 320,
    target_long: int = 640,
) -> tuple[np.ndarray, float]:
    """Upscale tiny vehicle crops so Stage-2 is not starved; return (work, scale_work/orig)."""
    h, w = img_bgr.shape[:2]
    long_side = max(h, w)
    if long_side <= 0:
        return img_bgr, 1.0
    if long_side >= min_long:
        return img_bgr, 1.0
    scale = float(target_long) / float(long_side)
    nw = max(1, int(round(w * scale)))
    nh = max(1, int(round(h * scale)))
    work = cv2.resize(img_bgr, (nw, nh), interpolation=cv2.INTER_CUBIC)
    return work, scale


def get_plate_yolo():
    """Lazy load ONNX first, then Ultralytics .pt (pack/read helpers)."""
    global _engine, _engine_error, _engine_kind
    if _engine is not None:
        return _engine
    paths = plate_weights_paths()
    if paths["onnx"]:
        try:
            _engine = OnnxPlateYolo(paths["onnx"])
            _engine_kind = "onnx"
            _engine_error = None
            return _engine
        except Exception as exc:  # noqa: BLE001
            _engine_error = f"onnx:{str(exc)[:160]}"
    if paths["pt"]:
        try:
            _engine = UltralyticsPlateYolo(paths["pt"])
            _engine_kind = "ultralytics"
            _engine_error = None
            return _engine
        except Exception as exc:  # noqa: BLE001
            _engine_error = ((_engine_error or "") + f" | pt:{str(exc)[:120]}").strip(" |")
    if not paths["onnx"] and not paths["pt"]:
        _engine_error = "plate_weights_missing"
    return None


def get_stage2_plate_yolo():
    """
    Stage-2 crop-in-crop localizer — Ultralytics YOLO on
    ai_engine/weights/ph_id_plates_best.pt (inside vehicle macro only).
    After require_stage2_ready() at boot, engine is present when weights exist.
    """
    global _stage2_engine, _stage2_error, _stage2_kind, _stage2_load_attempted, _stage2_disabled
    if _stage2_engine is not None:
        return _stage2_engine
    if _stage2_disabled:
        return None
    require_stage2_ready()
    return _stage2_engine


def stage2_yolo_required() -> bool:
    """True only when det mode asks for Ultralytics Stage-2 plate YOLO."""
    det = (os.environ.get("FM_ANPR_PLATE_DET") or "ph_id_yolo").strip().lower()
    return det in ("ph_id_yolo", "ph_id", "stage2", "yolo", "ph_id_only")


def require_stage2_ready() -> dict[str, Any]:
    """
    Boot gate for Ultralytics Stage-2.
    Missing weights or ultralytics must not kill ANPR — RapidOCR / FastALPR stay up.
    """
    global _stage2_engine, _stage2_error, _stage2_kind, _stage2_load_attempted, _stage2_disabled
    global _s2_crop_model_swapped
    det = (os.environ.get("FM_ANPR_PLATE_DET") or "ph_id_yolo").strip().lower()
    if not stage2_yolo_required():
        print(
            f"[anpr-stage2] soft-skip ultralytics ph_id — FM_ANPR_PLATE_DET={det} "
            "(Stage2 bbox via plate_pose_ccpd.py)",
            flush=True,
        )
        return {
            "ok": True,
            "kind": "skipped_ccpd_mode",
            "weights": None,
            "detMode": det,
        }
    if _stage2_engine is not None and not _stage2_disabled:
        return {
            "ok": True,
            "kind": _stage2_kind,
            "weights": getattr(_stage2_engine, "path", None) or stage2_plate_weights_path(),
        }
    crop_path = crop_plate_fallback_weights_path()
    prefer_crop = (os.environ.get("FM_ANPR_STAGE2_PREFER_CROP") or "0").strip().lower() in (
        "1", "true", "yes", "on",
    )
    ph_path = stage2_plate_weights_path()
    if prefer_crop and crop_path and os.path.isfile(crop_path):
        path = crop_path
        kind_label = "ultralytics-crop-plate"
    else:
        path = ph_path
        kind_label = "ultralytics"
    if not path or not os.path.isfile(path):
        if prefer_crop:
            path = download_crop_plate_model()
            kind_label = "ultralytics-crop-plate"
    if not path or not os.path.isfile(path):
        msg = (
            "Stage-2 plate YOLO weights not installed — ANPR stays up on RapidOCR / FastALPR."
        )
        _stage2_error = msg
        _stage2_disabled = True
        _stage2_load_attempted = True
        print("[anpr-stage2]", msg, flush=True)
        return {"ok": True, "kind": "skipped_no_weights", "weights": None, "detMode": det}
    try:
        import ultralytics  # noqa: F401
        from ultralytics import YOLO
    except Exception as exc:  # noqa: BLE001
        msg = "Stage-2 ultralytics not available — ANPR stays up on RapidOCR / FastALPR."
        _stage2_error = msg
        _stage2_disabled = True
        _stage2_load_attempted = True
        print("[anpr-stage2]", msg, flush=True)
        return {"ok": True, "kind": "skipped_no_ultralytics", "weights": None, "detMode": det}
    _stage2_load_attempted = True
    try:
        _ = YOLO(path)
        _stage2_engine = UltralyticsPlateYolo(path)
        _stage2_kind = kind_label
        _stage2_error = None
        _stage2_disabled = False
        if "crop-plate" in kind_label:
            _s2_crop_model_swapped = True
        print(
            "[anpr-stage2] READY ultralytics YOLO kind=" + kind_label,
            flush=True,
        )
        return {"ok": True, "kind": _stage2_kind, "weights": path}
    except Exception:
        msg = "Stage-2 weights would not load — ANPR stays up on RapidOCR / FastALPR."
        _stage2_error = msg
        _stage2_engine = None
        _stage2_kind = None
        _stage2_disabled = True
        print("[anpr-stage2]", msg, flush=True)
        return {"ok": True, "kind": "skipped_load_fail", "weights": None, "detMode": det}


def stage2_status_light() -> dict[str, Any]:
    """Health: report Stage-2 state (loaded at boot)."""
    path = stage2_plate_weights_path()
    return {
        "ready": _stage2_engine is not None and not _stage2_disabled,
        "kind": _stage2_kind,
        "error": _stage2_error,
        "weights": path,
        "weightsPresent": bool(path and os.path.isfile(path)),
        "disabled": _stage2_disabled,
        "aiEngineWeights": ai_engine_weights_dir(),
        "architecture": "stage2-ph-id-plates-yolo-v1",
        "seatbelt": "none_hard_stage2",
    }


def localize_plate_in_vehicle_crop(
    vehicle_bgr: np.ndarray,
    *,
    pad_frac: Optional[float] = None,
    conf_thr: Optional[float] = None,
) -> tuple[Optional[np.ndarray], dict[str, Any]]:
    """
    Run Stage-2 plate YOLO strictly on Stage-1 vehicle crop → padded plate micro.
    Returns (crop_bgr|None, meta). Does not run OCR.
    """
    global _stage2_disabled, _stage2_error
    meta: dict[str, Any] = {
        "source": "ph_id_plates_yolo",
        "architecture": "stage2-ph-id-plates-yolo-v1",
        "weights": stage2_plate_weights_path(),
        "aiEngineWeights": ai_engine_weights_dir(),
    }
    if vehicle_bgr is None or getattr(vehicle_bgr, "size", 0) == 0:
        meta["error"] = "bad_vehicle_crop"
        return None, meta
    eng = get_stage2_plate_yolo()
    if eng is None:
        meta["error"] = _stage2_error or "stage2_not_ready"
        return None, meta
    thr = float(
        conf_thr
        if conf_thr is not None
        else (os.environ.get("FM_ANPR_STAGE2_CONF", "0.01") or "0.01")
    )
    thr = max(0.01, min(0.5, thr))
    try:
        boxes = eng.predict_boxes(vehicle_bgr, conf_thr=thr)
    except Exception as exc:  # noqa: BLE001
        meta["error"] = "stage2_predict_exc:" + str(exc)[:120]
        print("[anpr-stage2] ph_id predict failed (no CCPD):", meta["error"], flush=True)
        return None, meta
    if not boxes:
        meta["error"] = "no_plate_in_vehicle"
        meta["stage2Conf"] = thr
        try:
            from anpr_funnel_log import bump
            bump("s2_no_plate", 1)
        except Exception:
            pass
        return None, meta
    best = boxes[0]
    meta["detScore"] = float(best.get("conf") or 0)
    meta["candidates"] = len(boxes)
    meta["stage2Conf"] = thr
    try:
        from anpr_funnel_log import bump
        bump("s2_plates_accepted", 1)
    except Exception:
        pass
    try:
        from dual_lpr import BOX_PAD_FRAC, crop_micro_from_box

        pf = float(pad_frac) if pad_frac is not None else BOX_PAD_FRAC
        # Stage-2 force: never drop accepted detections on aspect/window/sliver
        crop, box_meta = crop_micro_from_box(vehicle_bgr, best, pad_frac=pf, relax=True)
    except Exception as exc:  # noqa: BLE001
        meta["error"] = "crop_exc:" + str(exc)[:120]
        return None, meta
    if crop is None:
        meta["error"] = (box_meta or {}).get("error") or "plate_crop_reject"
        meta["reject"] = box_meta
        return None, meta
    meta["det"] = box_meta if isinstance(box_meta, dict) else {
        "x0": best.get("x0"),
        "y0": best.get("y0"),
        "x1": best.get("x1"),
        "y1": best.get("y1"),
        "conf": best.get("conf"),
        "score": best.get("conf"),
    }
    return crop, meta


def yolo_engine_status() -> dict[str, Any]:
    paths = plate_weights_paths()
    s2 = stage2_status_light()
    eng = None
    try:
        eng = get_plate_yolo()
    except Exception as exc:  # noqa: BLE001
        global _engine_error
        if not _engine_error:
            _engine_error = str(exc)[:160]
    return {
        "ready": eng is not None or bool(s2.get("ready")) or bool(s2.get("weightsPresent")),
        "kind": _engine_kind,
        "error": _engine_error,
        "onnx": paths["onnx"],
        "pt": paths["pt"],
        "stage2": s2,
    }
