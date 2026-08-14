# MOB-DISC ANPR Snapshot PASS + 1% conf + three-process isolation — 2026-08-14

**Status:** Snapshot **PASS** (operator). Planning lock only. **No APPLY.**  
**Related:** `docs/MOB-DISC-ANPR-ENGINE-STRATEGY-STOP-WHACKAMOLE-20260814.md`

---

## Snapshot result

- Operator: **PASS** — plate **`NDC 5447`** read correctly (crop + text).  
- UI showed **Confidence: 1%** — wrong / useless for operators (text is right; score is not trustworthy yet).  
- “No list match” on this read is separate from OCR (list probe after read).

**Do not block product on 1%.** Next confidence fix is a named MOB only when ordered (likely 0–1 vs 0–100 display, or RapidOCR conf not mapped after LTO lock).

Suggested later name (not applied): `ANPR-SNAPSHOT-CONF-DISPLAY-V1`.

---

## Three engines — share or split?

**Locked answer: three separate processes. Do not share one Python/GPU process.**

| Engine | Own process? | Why |
|--------|--------------|-----|
| **FR** | Yes (FR sidecar) | Face models + torch; crash/VRAM must not kill ANPR/Weapon |
| **Weapon** | Yes (Weapon sidecar) | RF-DETR / torch; same |
| **ANPR** | Yes (`anpr-sidecar` / `START-ANPR.bat` :8768) | Stage-2 YOLO + OCR; OpenMP/DLL history |

**Sharing one Python process = what kills services** (CUDA fight, DLL/shm, thread-pool deadlock, one OOM takes all analytics down).

**Already the intended ship shape:** three sidecars, three bats/venvs where possible.  
**Later work is not “invent split from zero”** — it is **keep them split**, never merge into one mega-Python, and prefer ANPR OCR on **ONNX** so ANPR does not need a second heavy CUDA stack beside FR/Weapon.

Optional later harden (named APPLY only): export ANPR Stage-2 YOLO to ONNX so ANPR torch load shrinks further (`ANPR-STAGE2-ONNX-EXPORT-V1`).

---

## Offline Video

Still **gated**: Snapshot PASS is done; confidence display is cosmetic. Offline Video remains a **separate APPLY** when operator starts that genre — not automatic.

---

## Operator plain English

1. Plate read works — good.  
2. Ignore the silly **1%** for now (or order a confidence display MOB later).  
3. **Yes — FR, Weapon, ANPR stay three separate engines.** Never one shared Python/GPU process.
