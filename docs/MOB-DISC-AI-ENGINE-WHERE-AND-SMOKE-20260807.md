# MOB DISC — Where is `ai_engine` and how to smoke (CPU) (2026-08-07)

**Status:** disc only. No code until APPLY.  
**Operator ask:** “Where? How to smoke? No directory — how do I know where the files are?”

---

## Where (absolute paths)

Everything lives under the ME8 lab root:

```
C:\Users\user\Desktop\Enterprise Mobility\ME8\
```

New folder (created this session):

```
C:\Users\user\Desktop\Enterprise Mobility\ME8\ai_engine\
  train.py          ← cloud / Colab GPU train ONLY
  main.py           ← local CPU FastAPI smoke server
  weights\
    README.txt      ← put weapon_rfdetr_best.pt here after Colab
```

**Not** inside `weapon-sidecar\` (that is the live ME8 Weapon bat on port **8769**).  
`ai_engine` is a **separate test engine** on port **8770** until a later MOB wires it into Analytics Weapon.

---

## What each file is for

| File | Machine | Job |
|------|---------|-----|
| `ai_engine\train.py` | Google Colab / cloud GPU | Download Roboflow + train → write `weights\weapon_rfdetr_best.pt` |
| `ai_engine\main.py` | This lab PC (CPU only) | Load weights (or base RF-DETR) + `POST /api/v1/detect` |
| `ai_engine\weights\weapon_rfdetr_best.pt` | Lab after copy | Custom weights — **missing until you train + copy** |

Without the `.pt` file, smoke still runs: `main.py` loads **base** RF-DETR on CPU (slower; not your fine-tune).

---

## How to smoke on this lab (CPU) — exact steps

1. Open **PowerShell**.
2. Go to ME8 root (not a random folder):

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
```

3. Use the **same Python venv as Weapon** (already has `rfdetr` / torch), or any venv with those packages:

```powershell
.\weapon-sidecar\.venv\Scripts\Activate.ps1
```

4. Start the CPU engine (leave window open):

```powershell
python -m uvicorn ai_engine.main:app --host 127.0.0.1 --port 8770
```

You should see: `Hardware set to: cpu` and either custom weights or “Custom weights not found… base”.

5. In a **second** PowerShell, health check:

```powershell
Invoke-RestMethod http://127.0.0.1:8770/health
```

6. Detect smoke (pick any JPG on disk):

```powershell
curl.exe -s -X POST "http://127.0.0.1:8770/api/v1/detect" -F "file=@C:\path\to\test.jpg"
```

Expect JSON: `{ "success": true, "detections": [ ... ], "device": "cpu" }`.

Stop: Ctrl+C in the uvicorn window.

---

## Cloud train (not on this PC)

On Colab / GPU box:

1. Upload or clone `ai_engine/train.py`.
2. Set env: `ROBOFLOW_API_KEY`, `ROBOFLOW_WORKSPACE`, `ROBOFLOW_PROJECT`, `ROBOFLOW_VERSION`.
3. Run `python train.py` → produces `weapon_rfdetr_best.pt`.
4. Copy that file to:

```
C:\Users\user\Desktop\Enterprise Mobility\ME8\ai_engine\weights\weapon_rfdetr_best.pt
```

5. Restart uvicorn smoke (step 4 above) — log should say **Loading custom fine-tuned weights**.

---

## What this is NOT

- Not `START-WEAPON.bat` (port 8769 / Analytics Weapon Recent).
- Not auto-wired into ME8 dashboard until a named MOB says so.
- Not “run train on the i9” — train script **exits** without CUDA.

---

## Recommendation (one next APPLY when you want product glue)

After smoke PASS on 8770 + custom `.pt` copied:

`MOB-APPLY WEAPON-AI-ENGINE-WIRE-SIDECAR-V1` — point live Weapon detect at this CPU engine **or** replace smoke weights path — **only after you order that APPLY**.

Until then: smoke = folder `ai_engine` + uvicorn on **8770** only.
