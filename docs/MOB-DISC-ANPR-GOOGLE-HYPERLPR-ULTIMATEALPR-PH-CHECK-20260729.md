# MOB DISC — Google ANPR stack vs PH / multi-region (HyperLPR3 · ultimateALPR · YOLO crop)

**Date:** 2026-07-29  
**Status:** **OPEN FOR DISCUSSION** — no engine swap until named APPLY  
**Trigger:** Operator + Google recommendation (HyperLPR3, ultimateALPR-SDK, YOLOv8/11 + EasyOCR)  
**Operator view:** Powerful crop + powerful letter/digit DL can be controlled so we see the number; check PH and other regions we care about  
**Related:**  
- `MOB-DISC-ANPR-STOP-HARDCODE-PLATE-NATIVE-ENGINE-20260729.md`  
- `MOB-DISC-ANPR-YELLOW-PUV-LOCK-V1-APPLIED.md`  
- `MOB-DISC-ANPR-MOB601-CONSOLIDATE-YOLO-PADDLE-20260729.md`

---

## Plain English

1. Google’s **pipeline idea is right**: detect plate → crop → enhance **only the crop** → recognize. That is how serious ALPR works. We already moved partway there (ROI + CLAHE + upscale); we still lack a **true plate recognizer** and packed **plate YOLO weights**.  
2. Google’s **named engines are not all equal for PH**.  
3. **HyperLPR3 is Chinese-plate gold — not PH gold.** Do not ship it as the PH reader hoping “Chinese DL is smarter.” The **pattern** (YOLO + plate net) yes; the **weights** no.  
4. **ultimateALPR** is the only one of the three that **explicitly lists Philippines** (Latin charset) and **Korea** — but it is **commercial SDK**, not a free drop-in.  
5. **YOLOv8/11 + EasyOCR** is a student-grade label for a real pattern; EasyOCR is still generic OCR — **weaker than** “plate YOLO + plate recognizer,” and not better than our current Paddle-on-crop for letters.

---

## Region check (what we sell / test)

| Market | Script | HyperLPR3 | ultimateALPR (docs) | YOLO+EasyOCR / Paddle |
|--------|--------|-----------|---------------------|------------------------|
| **PH** | Latin A–Z0–9 | **No** (CN types only) | **Yes** (Latin · “Philippines” listed) | Possible if crop good + fine-tune |
| **KR** | Hangul + digits | **No** | **Yes** (Korean charset since 2.7) | Needs Korean-capable rec |
| **TH** | Thai script | **No** | Unclear / contact (not Latin-only) | Needs Thai-capable rec |
| **CN** | CN plates | **Yes** (blue/yellow/NEV/HK-MO…) | Chinese charset available | Overkill for our PH-first lab |

HyperLPR3 README: supported types are **Chinese** (蓝牌/黄牌/新能源/港澳…). Explicit backlog: *“License plates from more countries.”*

ultimateALPR docs: Latin model trained on **150+ countries**, Europe-heavy; lists **Philippines**, Indonesia, etc.; **Korea** separate charset; detector country-agnostic; recognizer needs matching charset pack.

---

## Counter-check of Google’s three options

### 1. HyperLPR3

| Claim | Verdict |
|-------|---------|
| Gold for Chinese plates | **Agree** |
| YOLO + recognition net | **Agree** (architecture) |
| Use for PH yellow PUV | **Disagree** — wrong alphabet/layout priors; will not “just work” on WOO 185 |
| Edge ARM/NPU | Nice for CN edge; not our unlock for PH |

**Use:** Study architecture. **Do not** replace MOB-601 with HyperLPR3 for PH ship.

### 2. ultimateALPR-SDK (Doubango)

| Claim | Verdict |
|-------|---------|
| Multi-national / robust | **Plausible** — Latin includes PH; KR pack exists |
| Fast CPU/ARM SIMD | Documented strength |
| Free open ship core | **No** — commercial SDK; GitHub is SDK shell + samples; license cost + OEM/legal review |
| Drop in without PH samples | Docs say Europe-heavy; PH listed but **accuracy may need more PH samples** |

**Use:** Strong **evaluation candidate** for a paid lab bake-off on PH + KR photos — **after** legal/OEM OK. Not silent default.

### 3. YOLOv8/11 + EasyOCR (“system approach”)

| Claim | Verdict |
|-------|---------|
| Vehicle YOLO → plate YOLO → OCR | Vehicle step optional; **plate YOLO → rec** is the kill shot |
| EasyOCR as rec | **Weak pick** — generic OCR; bumper text still wins if crop soft |
| “Stop feeding full frame to OCR” | **Agree 100%** — already our harm story |

**Use:** Keep **plate YOLO crop** path. Prefer **LPRNet/CRNN or ultimateALPR rec** over EasyOCR. Paddle-on-**tight crop** stays interim.

---

## Operator hypothesis — controlled?

> Powerful crop + powerful letters/digits Chinese DL → we can control and see the number.

| Part | Answer |
|------|--------|
| Powerful **crop** (plate-only box) | **Yes** — this is the control knob. Chinese or Western YOLO plate detect both work if trained/fine-tuned on **vehicles with plates**, not on CN plate text. |
| Powerful **letter/digit** net | Only if trained (or fine-tuned) on **our charset + plate fonts**. CN HyperLPR heads expect CN plate structure. Latin LPR / ultimateALPR Latin / fine-tuned CRNN fit PH. |
| “Chinese DL” as magic | **No** — Chinese **pipeline**, regional **weights**. |

```
Control stack (recommended):
  [1] Plate detector (YOLO)     ← train/fine-tune on PH+KR+TH vehicle rears
  [2] Crop + CLAHE/upscale      ← already have
  [3] Plate recognizer (Latin)  ← LPRNet/CRNN or evaluate ultimateALPR
  [4] Thin region regex floor   ← keep (PH AAA###, etc.) — validator only
```

---

## One recommendation (no A/B dump)

**Do this order:**

1. **Finish yellow lock field PASS** (already APPLIED — operator retest).  
2. **Pack / fine-tune plate YOLO** (`ANPR-YOLO-WEIGHTS-PACK-V1` or equal) — Google Step 1–2.  
3. **Strategic bake-off MOB** (paper then APPLY):  
   - **A (prefer open):** plate YOLO + **LPRNet/CRNN** Latin fine-tune on our FAIL/PASS crops  
   - **B (paid eval):** ultimateALPR Latin on same PH set + KR pack if licensed  
   - **Reject as PH core:** HyperLPR3 weights · EasyOCR as primary  

Do **not** start a third OCR brand (EasyOCR) beside Paddle without dropping one.

---

## What Google got right (lock)

- Never OCR the full van.  
- Plate-only crop + enhance on crop.  
- Detect + recognize as a **system**, not “uni OCR demo.”

## What Google got wrong for us

- HyperLPR3 as default for PH.  
- EasyOCR as the high-end rec.  
- Implying Chinese plate gold = world plate gold.

---

## PASS / FAIL (strategy)

| Item | Status |
|------|--------|
| Pipeline pattern (crop-first) | **Accepted** |
| HyperLPR3 for PH ship | **Rejected** |
| ultimateALPR for PH/KR | **Eval candidate** (license first) |
| EasyOCR primary | **Rejected** |
| Next tactical | Yellow retest · then plate YOLO pack |
| Next strategic MOB name | Keep **`ANPR-PLATE-RECOGNIZER-V1`** (open LPR) · optional **`ANPR-ULTIMATEALPR-EVAL-V1`** |

**No code in this disc.**

---

## Operator decide

- Retest yellow after yellow-lock APPLY (if not done).  
- When ready for engine shift: say **`MOB-APPLY ANPR-PLATE-RECOGNIZER-V1`** (open path) **or** ask for eval disc/`MOB-APPLY ANPR-ULTIMATEALPR-EVAL-V1` if you want paid bake-off first.

---

## Lock record

| Item | Decision |
|------|----------|
| Google crop pipeline | **Yes** |
| HyperLPR3 PH | **No** |
| ultimateALPR PH/KR | **Yes listed** · commercial |
| EasyOCR | **No** as primary |
| Code | **None** until APPLY |
