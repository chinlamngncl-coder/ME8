# MOB DISC — Arrange remaining queue (Weapon / ANPR / FR) (2026-08-07)

**Status:** disc only this turn — **arrange order**. No code in this file.  
**You named:** `WEAPON-ALARM-TOAST-BLINK-V1` (must include **hit queue**).  
**Why disc first:** “please arrange? Mob disc” — lock the queue, then one APPLY.

---

## Locked product (short)

| Topic | Lock |
|-------|------|
| Weapon alert | Blink + toast; **no auto Ops**; operator chooses |
| Toast actions | **Ack** · **Open Weapon** · **Show on map** |
| Hit queue | Like FR: current toast + **+N** pending; Ack shows next |
| Backup PTT | **Later** MOB — not in blink V1 |
| Fake SOS | Never |
| Live ≠ Offline | No cross-contaminate FR / ANPR / Weapon |

---

## Arranged queue (do in this order)

| # | MOB | What | Notes |
|---|-----|------|-------|
| **0 done** | `WEAPON-LIGHTBOX-DRAG-X-PARITY-V1` | Drag + clear X | Done |
| **1 APPLIED** | **`WEAPON-ALARM-TOAST-BLINK-V1`** | HQ blink + toast + **queue** + Ack + Open Weapon + Show on map | Applied 2026-08-07 |
| 2 | `WEAPON-LIGHTBOX-POS-KEEP-V1` | Keep popup place until refresh | Can slip after 1 if you want alarm first |
| 3 | `WEAPON-TILE-CLICK-EXPAND-V1` | Live tile expand like FR/ANPR | |
| 4 | Colab B **negatives** (cars / bull bars) | Operator data + retrain B | Not a Fleet code MOB |
| 5 | `WEAPON-ALARM-BACKUP-PTT-V1` | Call backup / nearby PTT from toast | After toast PASS |
| 6 | `WEAPON-SNAP-KEEP-EVIDENCE-V1` | Keep photo like FR holds | |
| — | ANPR alert lab check | Confirm live toast → BWC → Ops still PASS | Only if you say FAIL |

**POS-KEEP / TILE-EXPAND** sit **after** blink toast in this arrange (alarm wake HQ first). Say if you want UI polish before alarm.

---

## Inside `WEAPON-ALARM-TOAST-BLINK-V1` (exact scope)

**Does**

1. On `weapon-detect` (any dashboard page, not only Weapon tab): show **WEAPON** blink strip + toast.  
2. Toast shows: crop thumb · cam/BWC name · gun/knife · time.  
3. **Queue:** if toast busy, new hits wait; badge **+N**; Ack/Dismiss → show next. Same cam refresh updates current (no duplicate spam).  
4. Buttons: **Ack** (stop blink for current / pull next) · **Open Weapon** (Analytics → Weapon + that cam) · **Show on map** (Ops + focus that pin — BWC or fixed; **no** FR blacklist wall steal).  
5. Cache-bust.  

**Does not**

- Auto jump Ops  
- Auto PTT / Call backup  
- Fake SOS  
- FR/ANPR rail pollution  
- Photo Keep to disk  

---

## One next APPLY (after toast PASS)

`MOB-APPLY WEAPON-LIGHTBOX-POS-KEEP-V1`

Or `MOB-APPLY WEAPON-TILE-CLICK-EXPAND-V1` if expand first.
