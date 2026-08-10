# MOB DISC — Plan: learn both (knife+ / car−) + Ack add-on audit (2026-08-08)

**Status:** plan only. **One MOB at a time.** No product/Colab edit until you `MOB-APPLY` the named step.  
**You want:** (1) stop stupid knife/gun on car/blur — train **both** sides; (2) Accidental Ack / case **add-on** with audit; super-admin gate if needed.

---

## Part 1 — Learning both (yes, possible)

### Plain idea

The model learns from **two kinds of pictures**:

| Kind | What you put in | What the model should learn |
|------|-----------------|-----------------------------|
| **Positive** | Real **knife** / person **carrying knife** (and real gun stills if thin) | “This shape = knife/gun — alarm” |
| **Negative** | Black SUV, bull bar, blur/white junk, empty street — **no weapon** | “This is **not** a weapon — stay quiet” |

Doing **only** car negatives is half the job.  
Doing **only** knife positives without car negatives → car still fools it.  
**Both** in the same Track B Colab train = correct.

### What we do **not** do

- Do not “select” live false-alert snaps one-by-one inside the product as the main train path (no magic “teach from this toast” button yet).  
- Do not retrain Track A smoke for this.  
- Do not invent a new architecture (stay Medium / 576 / 7 classes).

### What we **do** (data → Colab → reload)

| Step | Who | What |
|------|-----|------|
| **1** | Agent (APPLY) | Fetch / pack **more negatives**: black SUV, bull bar, dark cars, washed-out / blur junk (no weapon) |
| **2** | Agent (APPLY) | Fetch / pack **knife positives**: knife alone + **person carrying knife** (license-safe public stills; boxes if we can, else same Colab merge rules we already use) |
| **3** | Agent | One zip (or two clear zips) + **Colab cells already locked** (no forgotten pip / amp / workspace) |
| **4** | You | GPU on → ▶ cells → download `.pt` → overwrite weights |
| **5** | You type APPLY | `WEAPON-B-NEGATIVES-RELOAD-V1` (same reload name) |

**PASS live:** police/black SUV / blur → rare or no alarm; real knife in hand / real gun → still hits.

### Colab — stop repeating agent misses (locked checklist)

Before every train, Cell 1–2–6 **must** already be:

1. **GPU** on first.  
2. Cell 1: `pip install "rfdetr[train,loggers]" …` — never bare `rfdetr`.  
3. Cell 2: workspace `weopon-detection` / project `weapon-detection-using-yolov8` / version `1` — **API key only** for you.  
4. Cell 6: `model.train(**train_kw)` — **no `amp=True`**.  
5. Paste **code only** from `WEAPON-B-CAR-BAR-COLAB.md` (or the updated pack guide after APPLY).  

Agent duty: when we APPLY the next Colab/pack MOB, the md must include knife+ and car− merge **and** this checklist at the top. No “remember from chat.”

---

## Part 2 — Accidental Ack + “add-on” (ops / audit)

### What you mean (restated)

- Operator **Ack’d too soon** → need a way to **come back** and **add on** (note / report / keep / escalate).  
- Some add-ons may need **super admin allow**.  
- Whenever anyone **touches** that case/file → store **time + user name** (audit).

### Today

| Piece | Status |
|-------|--------|
| Ack | Clears **current** toast only; advances queue |
| Retrieve after Ack | Weak — Recent rail helps a bit; **no** full alert history case file |
| Add-on / amend | **Not built** |
| Super-admin gate | **Not built** |
| Touch audit (who/when) | **Not built** for Weapon toasts |

### Target design (simple)

```
Hit happens → toast → Ack or FP or Report
                ↓
         Alert / case record (kept)
                ↓
    Later: Open history → Add-on (note, keep snap, escalate)
                ↓
    Every touch: timestamp + username logged
                ↓
    Sensitive add-on (e.g. delete case, change verdict FP↔real):
         needs Super Admin approve (optional flag)
```

### Suggested rules

| Action | Who | Audit |
|--------|-----|--------|
| Ack / FP / open map | Any Weapon-capable operator | who + when |
| **Add-on note** / attach Keep snap | Operator on that case | who + when |
| Change verdict (FP ↔ confirmed weapon) | Operator **or** require Super Admin — **your call** in APPLY | who + when + old→new |
| Delete / purge case | **Super Admin only** | who + when |
| Accidental Ack recover | Open **History** → same case → Add-on / Report | who + when |

**Recommendation:**  
- **Retrieve + add-on note** = all operators (with audit).  
- **Delete case** and maybe **override FP after Report** = Super Admin.  
You confirm when we reach that MOB.

---

## Part 3 — One-by-one queue (do in this order)

| # | You type | What you get |
|---|----------|----------------|
| **1 DONE** | `WEAPON-B-FETCH-HARD-NEG-V3` | Pack ~335 JPGs + rebuilt `negative_car_bar_pack.zip` (dark car + blur/wash) |
| **2 DONE** | `WEAPON-B-FETCH-KNIFE-POS-V1` | Pack 120 knife JPGs + boxes + `positive_knife_pack.zip` (99 with person in frame) |
| **3 DONE** | `WEAPON-B-COLAB-CELLS-BOTH-V1` | Guide: `ai_engine/colab/WEAPON-B-BOTH-COLAB.md` |
| **4 PARKED** | (you) Run Colab once | **GPU limit** — resume Sun/Mon when quota returns (see `MOB-DISC-WEAPON-COLAB-GPU-PARK-DO-OPS-NOW-20260808.md`) |
| **5** | `MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1` | After new `.pt` lands |
| **6 NEXT (no GPU)** | `MOB-APPLY WEAPON-ALERT-HISTORY-RETRIEVE-V1` | After Ack, open history / re-open hit |
| **7** | `MOB-APPLY WEAPON-CASE-ADDON-AUDIT-V1` | Add-on note + **time + username** on every touch |
| **8** | `MOB-APPLY WEAPON-ADDON-SUPERADMIN-GATE-V1` | Which add-ons need Super Admin (after 7 PASS) |
| later | `WEAPON-FALSE-POSITIVE-V1` / Report / sounds / faster snap | As already arranged |

**Sounds / faster snap / FP button** stay **after** history+addon unless you reorder.

---

## What you do right now

Colab train is **parked** (GPU limit).  
**Next without GPU:** `MOB-APPLY WEAPON-ALERT-HISTORY-RETRIEVE-V1`
