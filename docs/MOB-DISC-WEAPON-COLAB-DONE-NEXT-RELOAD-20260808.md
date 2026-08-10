# MOB DISC — Colab train DONE → what next (2026-08-08)

**Status:** disc only.  
**Your screen:** Train finished (`max_epochs=30`). File exists: `/content/weapon_rfdetr_best.pt` (~134 MB). Negatives folder present. **PASS on Colab side.**

---

## What you do now (operator — 3 steps)

### 1) Download the weights from Colab

In Colab file list (left): click **`weapon_rfdetr_best.pt`** → download  
(or run Cell 7 / a box with):

```python
from google.colab import files
files.download("/content/weapon_rfdetr_best.pt")
```

### 2) Put it on the lab PC (replace old)

Save / overwrite here:

```text
C:\Users\user\Desktop\Enterprise Mobility\ME8\ai_engine\weights\weapon_rfdetr_best.pt
```

Replace the old file. Keep the **same name**.

### 3) Tell the agent to reload on 8769

Type:

```text
MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1
```

Agent will: slim checkpoint if needed → restart Weapon on **8769** → prove `weights_kind: colab_b`.

### 4) You PASS/FAIL live

Hard refresh → Weapon Start watch → car/bull-bar scene should **not** false-gun (or much less) → real gun still hits.

---

## Do not

- Leave the `.pt` only in Colab (lab will keep old weights)  
- Rename to something else  
- Retrain Track A  
- Skip the RELOAD APPLY (Fleet won’t pick up the new file until sidecar reloads)

---

## Queue after RELOAD PASS

| Next | When |
|------|------|
| Live car/bar PASS | You |
| `WEAPON-TILE-CLICK-EXPAND-V1` etc. | UI queue if you want |
| `WEAPON-ALARM-BACKUP-PTT-V1` | Later |

---

## One next line (when file is on disk)

`MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1`
