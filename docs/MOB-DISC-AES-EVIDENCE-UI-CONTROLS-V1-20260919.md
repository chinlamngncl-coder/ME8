# MOB DISC — AES Evidence UI controls (Play / Cancel / Export) — 2026-09-19

**Status:** UI design lock for next code MOB.  
**Depends on:** `AES-USIP-FILE-DECRYPT-V1` (helper done) · `MOB-DISC-AES-EVIDENCE-CHAIN-V1`  
**Next code APPLY:** `AES-EVIDENCE-PLAY-WIRE-V1` (wire these controls — do not ship decrypt with no operator path)

**Not this paper:** Type B cert, live FLV crypto.

---

## Why this disc exists

Decrypt-only without Evidence buttons is a half MOB. Operators need a clear **Play · Cancel · Export** path for court work.

---

## Locked UI (Evidence file row / preview)

| Control | Label (title case) | Behavior |
|---------|-------------------|----------|
| Badge | **AES** | Show on `*-AES.*` (and HDA1) files — grey if locked, green when play session active |
| **Play** | Play | Stream decrypted via existing Evidence play (server unlock in memory / short temp). Does **not** write a permanent open file into the case folder |
| **Cancel** / **Close** | Close | Stop player; wipe short-lived temp if any |
| **Export** | Export Packed | Download still **AES-packed** (or password court zip) — never “Save as open MP4” as default |
| Optional advanced | Save Open Copy | Super-admin only, confirm modal: “Creates unencrypted file. Court risk.” Default **off** / hidden for operators |

No permanent teach strip (title is enough). Confirm modal only on dangerous Save Open Copy.

---

## States

| State | Operator sees |
|-------|----------------|
| Master secret missing | Play disabled; one-line: “AES unlock not configured” (IT) |
| Decrypt fail | Toast / inline error — factual, no key details |
| Playing | Player + AES badge; Close ends session |
| Export | Same packed download flow as today, marked AES |

---

## Audit (with Play / Export)

Log: user, time, file id/name, action = `usip_aes_play` | `usip_aes_export` | `usip_aes_save_open` (if used).

---

## PASS (when PLAY-WIRE APPLY done)

1. AES file shows **AES** badge  
2. **Play** opens picture/sound  
3. **Close** stops and cleans temp  
4. **Export Packed** leaves site still locked  
5. Normal (non-AES) files unchanged  

---

## APPLY name

`MOB-APPLY AES-EVIDENCE-PLAY-WIRE-V1`  
