ANPR-COLAB-PLAN-V1 — dataset stash

1) Label stills with ONE class: plate (box each plate).
2) Prefer misses: night / angle / far BWC / yellow / rain.
3) Export Roboflow (or label tool) as YOLO detect zip → put in exports/
4) Colab recipe: ME8/ai_engine/colab/ANPR-DETECT-COLAB.md
5) Product weights: anpr-sidecar/models/plate_yolo11n.onnx
6) After copy: restart sidecar 8768 → MOB-APPLY ANPR-WEIGHTS-RELOAD-V1

Do not put Weapon zips here. Do not use PP-OCR trainers.
