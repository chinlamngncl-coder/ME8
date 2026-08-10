# MOB DISC — Best-of-best shotgun / long-gun analytics (2026-08-06)

**Status:** disc only. No code until APPLY.  
**License lock stays:** MIT / Apache-2.0 only. **No Ultralytics AGPL.**  
**Operator:** shotgun carried on shoulder was not captured; wants options for shotgun analytics.

---

## Honest bottom line

There is **no** ready “best shotgun model” we can legally drop in that beats our stack without AGPL or a **custom train**.

Most GitHub/HF cards that say **Shotgun** as its own class are **YOLOv8** → **AGPL-3.0** (banned), even when the repo says MIT.

Our current engine already treats shotgun as **Gun** (one class). Miss = **recall / pose / still timing**, not “we forgot the shotgun label.”

---

## Options (what exists)

| # | Option | License | Shotgun? | Verdict for Axiom |
|---|--------|---------|----------|-------------------|
| A | **Keep Threat RF-DETR Nano** (what we ship) | Apache-2.0 | Gun class **includes** pistol/rifle/firearm per HF card | **Stay.** Best legal ready weights. Tune recall. |
| B | RF-DETR **Small/Medium/Large** + same or our fine-tune | Apache-2.0 (Nano–Large only; XL/2XL = PML ban) | Better long shapes if we train | Strong later; heavier GPU/CPU |
| C | **Train our own** RF-DETR Nano on BWC/CCTV stills: shoulder carry, shotgun, rifle, pistol | Apache train + Apache runtime | Real shotgun/long-gun data | **Best accuracy path** — weeks of data, not overnight |
| D | HF YOLO “firearm / 9-class shotgun” (Subh775 YOLO, nazmul 9-class, SyncRobotic, …) | Weights may say Apache/MIT; **runtime Ultralytics = AGPL** | Often has Shotgun class | **Banned** |
| E | Separate person model + “long stick on shoulder” heuristic | MIT/Apache person models exist | Not a real shotgun detector | Too weak / false tools-brooms |
| F | Commercial closed API (AWS Rekognition weapons, etc.) | Vendor ToS / cost | Unknown lab fit | Out of ship-offline Axiom design |

**CN / EN search:** same pattern — “枪械检测 YOLO” everywhere; legal commercial open path that is strong remains **RF-DETR family**, not a magic shotgun YOLO.

---

## Why your shotgun walk was missed (with A)

1. Long gun on shoulder ≈ thin stick / broom in one still — conf often **&lt; 0.50**.  
2. Still poll + 2-frame confirm can skip the best angle.  
3. Model trained more on clear gun shapes than distant carry.  
4. Label would still say **gun**, never **shotgun** — we have no shotgun class in v1.

Knife pain is separate: knife class is noisy; do not “fix shotgun” by turning knife looser.

---

## Recommendation (one path)

Do **not** switch to YOLO for shotgun.

**Next product MOB (after stills feel OK):**

### `WEAPON-LONG-GUN-RECALL-V1`

Stay on Threat RF-DETR. Lab-only knobs:

1. Slightly **lower gun conf** (e.g. 0.50 → 0.40) for class **gun only**.  
2. Keep **knife** at **0.55+** or higher (stop knife junk).  
3. Optional: longer side of context already helps carrier; no class rename.  
4. Recent label stays **gun** (includes shotgun/rifle) — UI can say **Firearm** later if you want wording, not a new engine.

**Best long-term (separate project, not this week):**  
`WEAPON-RFDETR-FINETUNE-BWC-V1` — our own Apache fine-tune on your lab shotgun/rifle/pistol stills. That is the real “best of best” for *your* cameras.

---

## APPLY names (when you choose)

- Tune now: **`MOB-APPLY WEAPON-LONG-GUN-RECALL-V1`**  
- Later train: disc + APPLY when you have labeled stills ready  

No APPLY in this message.
