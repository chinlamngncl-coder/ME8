# MOB DISC — ANPR engine consolidate: MOB-601 (YOLO11+Paddle) vs prior Axiom plan

**Date:** 2026-07-29  
**Status:** **LOCKED consolidation** (paper only — no code until named APPLY)  
**Search:** MOB-601, YOLO11, PaddleOCR, OpenCV medianBlur, PH regex, 80% confidence, ZLM consumer, AAJ 8008  
**Operator input:** Google / MOB-601 system prompt (4 rules) + ask to counter-check vs agent suggestion  
**Evidence FAIL:** crop **AAJ 8008** → card **AAJ 80584** @ **67%**  
**Related:**  
- `MOB-DISC-ANPR-OCR-FAIL-FR-STYLE-LIVE-VIDEO-CROP-MATCH-20260729.md`  
- `MOB-DISC-ANPR-PRODUCT-LIVE-SNAPSHOT-LISTS-20260729.md`  
- `MOB-DISC-ANPR-ZLM-WORKER-STREAM-FANOUT-20260729.md`  
- `MOB-DISC-ANALYTICS-PACK-LIKE-FR-AND-PUBLIC-NOTICE-AFTER-WEAPONS-20260729.md`

---

## Confirmation (MOB-601 rules — accepted for pipeline core)

**Confirmed. I will build MOB-601 as a read-only ZLM consumer, enforce OpenCV artifact cleaning, apply regional Regex locks, and maintain a strict >80% confidence floor.**

(Build only after you say **go ahead** / `MOB-APPLY …` — this disc locks design, not code.)

---

## What each side said

### A) Agent prior suggestion (Axiom discs)

| Piece | Suggestion |
|-------|------------|
| Keep | WVP/ZLM video base; ANPR = downstream consumer |
| Engine | YOLO (or equal) detect + **PaddleOCR** (not ship-Tesseract) |
| UI | FR-style: Snapshot + **Load video** + Live; crop; plate lists match |
| Quality | Confidence floor / confirm on weak reads; multi-frame vote later |
| Pack | Models/sidecar **like FR** before customer ship |
| Order | Engine → lists → offline video → live |

### B) MOB-601 (Google / CV lead prompt)

| Rule | Requirement |
|------|-------------|
| 1 | Read-only ZLM consumer (RTSP/HTTP-FLV); controlled FPS; metadata JSON only; **do not** touch ZLM routing |
| 2 | **Never** raw colour crop → OCR; OpenCV preprocess (min: grayscale + `medianBlur` e.g. k=3) |
| 3 | Regional regex locks (PH example: `([A-Z]{3})(\d{3,4})`); strip NCR / discard illegal shapes |
| 4 | Average OCR confidence **&lt; 80%** → **drop** (no garbage to dashboard) |
| Stack | **YOLO11 + PaddleOCR** Deep Learning pipeline |

---

## Counter-check (rule by rule vs FAIL + Axiom)

| MOB-601 rule | vs Axiom discs | vs AAJ 8008 → 80584 | Verdict |
|--------------|----------------|---------------------|---------|
| **1 ZLM read-only** | Identical to WVP-finish + ZLM fan-out discs | N/A (snapshot path) | **KEEP — locked** |
| **2 OpenCV clean** | Axiom said “engine upgrade”; did **not** yet lock preprocess | Screws/dirt/halation → digit invent; blur helps | **ADOPT — mandatory** |
| **3 PH regex** | Axiom said normalize; did not lock format | **AAJ80584** = 5 digits → **illegal** under `AAA####`; **AAJ8008** = legal | **ADOPT — would have blocked this FAIL** |
| **4 ≥80% floor** | Axiom wanted harder warn; 67% still shown as success | **67% &lt; 80%** → must not publish as good read | **ADOPT — locked for auto/live** |
| **YOLO11 + Paddle** | Same family as product plan | Replaces tesseract.js ship path | **ADOPT as ship engine** |
| FR live + offline video UI | MOB-601 silent on UI intakes | Needed for ops parity | **KEEP Axiom — same engine, three intakes** |
| Plate lists match | MOB-601 silent | FR-style “match” | **KEEP Axiom — after readable engine** |
| Pack like FR | MOB-601 silent | Air-gap ship | **KEEP Axiom — gate before customer pack** |

**Bottom line:** MOB-601 is the **correct CV core**. Axiom discs still own **product surface** (Analytics hub, three intakes, lists, pack, manuals/notice). Not either/or — **merge**.

---

## How MOB-601 would have handled this FAIL

| Stage | AAJ case |
|-------|----------|
| Crop | Operator box includes plate (+ maybe NCR footer) |
| OpenCV | Gray + median blur → less screw/noise hallucination |
| PaddleOCR | May still misread occasionally |
| Regex PH | Raw `AAJ80584` → **reject** (not 3+3/4). Raw `AAJ8008` / `AAJ 8008` → **accept** after strip spaces |
| Confidence | 67% → **drop** (live: silent; snapshot: see nuance below) |
| Dashboard | Would **not** show green “success” garbage plate |

So: MOB-601 rules are **directly aimed at this bug class**. Adopt them.

---

## Nuances (consolidate carefully — do not blind-copy)

### 1) Silent drop vs Snapshot UI

| Path | Behavior |
|------|----------|
| **Live / offline auto frames** | Confidence &lt; 80% **or** regex fail → **drop silently** (no hit spam) — MOB-601 as written |
| **Snapshot “Read plate” button** | Same floors: do **not** put illegal/low-conf string in the big plate field as success. Show plain: **“No reliable plate read — re-crop or try again”** (and optional operator **Confirm / edit** later for SOP). Never display `AAJ 80584` as the answer |

### 2) Region packs (not PH-only forever)

| Region key | Format lock (V1 intent) |
|------------|-------------------------|
| `ph` | `^[A-Z]{3}\d{3,4}$` after strip (MOB-601 example) |
| `kr` / `th` / … | Separate regex tables when those deployments ship |

Config: `FM_ANPR_REGION=ph` (or site setting). Wrong region → wrong rejects — IT sets per install.

### 3) YOLO11 on Snapshot

Operator crop can feed OCR **after** OpenCV; optional YOLO refine box inside the photo. Live/offline: YOLO detect → crop → OpenCV → Paddle → regex → floor.

### 4) Do not modify ZLM

Forbidden: replace ZLM, new BWC invite storm, rewrite handoff for “ANPR special.”  
Allowed: consume existing play URL / FLV / RTSP published by WVP/ZLM.

### 5) Retire tesseract.js as ship default

Lab shell may remain as fallback only behind env hatch — **not** customer path. Ship = packed YOLO11 + Paddle (+ OpenCV) **like FR**.

---

## Consolidated architecture (one path)

```
Intakes (Analytics → ANPR, FR-style)
  Snapshot photo | Offline video | Live ZLM consumer (read-only)
        ↓
  YOLO11 plate box (auto)  +  operator crop when snapshot
        ↓
  OpenCV: gray + medianBlur (+ optional more later)
        ↓
  PaddleOCR → raw text + char/avg confidence
        ↓
  Regional regex lock (ph/kr/…)  +  confidence ≥ 0.80
        ↓
  Plate lists match (Blacklist / Wanted / Suspicious)  [next MOB]
        ↓
  Metadata / result card / hits  (no ZLM routing changes)
```

**Pack:** `anpr-sidecar/` (or equal) + weights + START bat → ship script copy like `fr-sidecar`.

---

## Revised MOB order (after consolidation)

| # | MOB | Outcome |
|---|-----|---------|
| 1 | `ANPR-ENGINE-MOB601-V1` | YOLO11 + Paddle + OpenCV preprocess + region regex + ≥80% floor; wire Snapshot **Read plate** to this engine; PASS on AAJ 8008-class |
| 2 | `ANPR-PLATE-LISTS-V1` | Lists + match on accepted reads only |
| 3 | `ANPR-OFFLINE-VIDEO-CROP-V1` | FR Load video → frames → same engine |
| 4 | `ANPR-LIVE-ZLM-WORKER-V1` | Read-only ZLM consumer @ capped FPS → same engine → hits |
| 5 | `ANPR-SHIP-PACK-PARITY-V1` | Models/START in customer zip like FR |
| 6 | Public notice / manuals | After weapons + freeze (existing discs) |

**Agent recommendation:** Apply **`ANPR-ENGINE-MOB601-V1`** next. That is the fix for “very bad results,” not more UI first.

---

## What we reject / park

| Idea | Why |
|------|-----|
| Keep Tesseract as ship OCR | Proven FAIL on clear PH plate |
| Show mid-confidence wrong plates | Violates Rule 4 + operator trust |
| Replace ZLM / new media stack | Violates Rule 1 + Axiom WVP lock |
| Live UI before engine PASS | Repeats garbage at scale |
| PH regex only forever with no config | Breaks KR/TH later — use region table |

---

## Operator decide

If this consolidation is good:

- Say **go ahead** / `MOB-APPLY ANPR-ENGINE-MOB601-V1`

No code until that APPLY.

---

## Lock record

| Item | Decision |
|------|----------|
| MOB-601 Rules 1–4 | **Accepted** for ANPR CV core |
| YOLO11 + PaddleOCR | **Ship engine** (replace Tesseract default) |
| OpenCV gray + medianBlur | **Mandatory** before OCR |
| Regional regex + ≥80% | **Mandatory**; snapshot shows soft fail text, not wrong plate |
| FR-style intakes + lists + pack | **Still required** (Axiom layer) |
| Next APPLY (default) | `ANPR-ENGINE-MOB601-V1` |
| Code in this disc | **None** |
