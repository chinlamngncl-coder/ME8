# MOB DISC — Offline status words, slow match, hub tab fonts (2026-08-05)

**Status:** APPLIED `ANPR-OFFLINE-STATUS-MATCHING-HUB-FONT-V1` (2026-08-05). Speed MOB not applied yet.  
**Scope:** ANPR Offline Match chrome + why it is still slow; Analytics hub L1 vs L2 fonts. Live watch / FR engine unchanged.

## Confirm: I understand

1. Status under the file name shows **Sampling… (failed)** (and similar). You only want **Matching...**
2. Offline match is **really really slow** (clip ~9 min, still almost no captures).
3. **Face recognition / ANPR / Weapon detection** pills look different from the row under them (**Live / Snapshot / Offline Match / …**). Same family or not?

## Honest answers

### 1) Status words

That line is from the last offline MOB. It prints Sampling + skip codes (`failed`, `no_plate`, wait…). Operator does not need that.

**Fix:** while Play is on, status = **Matching...** only. No failed / sampling / codes. Hit can still update Recent; do not spam the status with plate jargon.

### 2) Why still slow

V1 downscaled the JPEG and asked Node for **fast** OCR. Sidecar **`POST /read` never uses `ocr_path`**. Pipeline still runs **heavy** (vehicle YOLO + dual OCR). One frame can sit for a long time. Busy gate then skips the next ticks → feels frozen, status shows `(failed)`.

Engine OK in the header does not mean each frame is fast.

**Fix (next engine MOB):** pass `ocr_path` through sidecar `/read` → FastALPR **live** path for offline only. Snapshot Investigation stays **heavy** (no `ocrPath` field).

### 3) Fonts — not the same

| Row | What | Font now |
|-----|------|----------|
| L1 | Face recognition / ANPR / Weapons | **15px**, weight 500, system-ui, letter-spacing 0.3px |
| L2 ANPR | Live / Snapshot / Offline Match / … | **11px**, normal weight, page font |
| L2 FR | Live Watch / Load video / … | same small 11px class |

L1 was enlarged later. L2 was left small. Same pill shape, different type → looks like two products.

**Fix:** L2 (ANPR + FR) uses the **same** font-family / size / weight / letter-spacing as L1. Tertiary Offline Video / Image Investigation stays as-is.

## Recommendation (order)

Chrome first (what you see now), then engine (speed).

## One next APPLY

**`MOB-APPLY ANPR-OFFLINE-STATUS-MATCHING-HUB-FONT-V1`**

- Status = `Matching...` only while playing.
- Hub L2 tabs match L1 font tokens.

After that PASS:

**`MOB-APPLY ANPR-OFFLINE-READ-HONOR-OCR-PATH-V1`**

- Sidecar `/read` honors `ocr_path` so offline is actually fast-path.

## Operator pass (after first APPLY)

Hard-refresh → ANPR → Offline Match → Play.

- Status stays **Matching...** (no Sampling / failed).
- FR / ANPR / Weapons and Live / Snapshot / Offline Match look like the same type.
- Speed may still be slow until the second APPLY.
