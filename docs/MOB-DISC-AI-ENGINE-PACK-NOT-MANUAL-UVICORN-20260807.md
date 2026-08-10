# MOB DISC — `ai_engine` must not be manual forever (pack / customer) (2026-08-07)

**Status:** disc only. No code until APPLY.  
**Operator:** “Must I do uvicorn every time? What about pack? User cannot do it like this — no reason, no meaning.”

---

## Confirm

You are right.

The PowerShell `uvicorn ai_engine.main:app …8770` steps are **lab smoke only** — so you (and AI) can prove CPU load + `/detect` before wiring.

They are **not** the customer product. A packed Mobility Axiom user must **never**:

- Open PowerShell  
- `cd` to ME8  
- Activate a venv  
- Type uvicorn  
- Remember port 8770  

If that stays the story, the folder has **no pack meaning**. Fair fail.

---

## Two different jobs (do not mix)

| Job | Who | How |
|-----|-----|-----|
| **Lab smoke** (now) | You | Manual uvicorn once while testing `ai_engine` |
| **Product / pack** (when ready) | Customer | Double-click Start (or ME8 auto-starts engine) — same class as `START-WEAPON.bat` / FR sidecar |

Cloud train (Colab) stays **your** desk job before ship: produce `weapon_rfdetr_best.pt`, drop into pack weights. Customer does **not** train.

---

## What pack-ready must look like (locked intent)

1. **One Start path** — e.g. `START-AXIOM.bat` / existing ME8 Start already brings up Node **and** weapon engine (no second secret window the user must invent).  
2. **Weights inside the zip** — `ai_engine/weights/weapon_rfdetr_best.pt` (or the live sidecar `models\` path we choose in APPLY) signed/shipped with the build.  
3. **CPU forced** on customer PCs without NVIDIA — same as lab i9 rule.  
4. **Dashboard uses the engine** — Analytics Weapon hits the running engine automatically. No refresh ritual, no “start Python yourself.”  
5. **If engine down** — clear UI: “Weapon Engine — Not ready” + one recovery (restart Start bat), not a developer cookbook.

Until those five are true, treat `ai_engine` as **engineering scaffold**, not ship surface.

---

## Recommendation (one product path — no A/B)

Do **not** invent a second forever product. Fold into the Weapon sidecar family customers already start:

| Order | MOB | Why |
|-------|-----|-----|
| 1 | Finish cloud train + drop good `.pt` / `.pth` with **negatives** (quality) | Packing a rubbish head is worse than no fine-tune |
| 2 | `WEAPON-AI-ENGINE-PACK-START-V1` | `START-WEAPON.bat` (or ME8 Start) launches CPU engine; health on known port; weights path under ship tree |
| 3 | `WEAPON-AI-ENGINE-WIRE-LIVE-V1` | Live poller / Recent uses that engine (replace or behind flag) — operator never touches uvicorn |

Optional small lab helper (only if you APPLY): `START-AI-ENGINE-SMOKE.bat` double-click for **your** smoke — still not for customer zip root unless pack MOB says so.

---

## Honest meaning of today’s folder

- **Meaning now:** cloud-train script + CPU infer prototype so we stop pretending the i9 trains.  
- **Meaning at pack:** only after Start + weights + wire MOBs PASS.  
- **No meaning if frozen as manual uvicorn:** agree — delete-from-ship-mind until pack MOB.

---

## APPLY when ready (not now unless you say)

After weights are worth shipping:

1. `MOB-APPLY WEAPON-AI-ENGINE-PACK-START-V1`  
2. then `MOB-APPLY WEAPON-AI-ENGINE-WIRE-LIVE-V1`

You do **not** need to run uvicorn every session for normal ME8 Weapon work — that remains `START-WEAPON.bat` until we wire the new engine.
