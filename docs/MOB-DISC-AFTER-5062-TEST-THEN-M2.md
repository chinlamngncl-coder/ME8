# MOB DISC — After Fleet 5062: test first, then which MOB

**Date:** 2026-07-17  
**Status:** Paper lock  
**With:** `MOB-DISC-BWC-ONE-ROW-WVP-ZLM-WHAT-TO-KEY.md`  
**M1 done:** `mob-fleet-sip-port-5062-v1` (PC stack)

---

## Answer

**Test first. Do not APPLY the next code MOB until the prove below is PASS or FAIL.**

Fleet **5062** = PC only (Fleet SIP listen). You do **not** type 5062 on a one-row BWC.

---

## Your test now (operator)

1. Stop Fleet → WVP lab up (proxy **5060**) → Start Fleet (log: SIP **5062**).  
2. BWC one row → Wi‑Fi IP · **5060** · platform `4401020049` · pwd `admin123`.  
3. WVP device list: cam **online**.  
4. Soft Open Chin (or kk).

| Result | Meaning | Next |
|--------|---------|------|
| Cam online + picture sharp / native-ish · log `wvp-zlm primary` | M1 path good | Optional: still do M2 to **lock** wall = WVP-only |
| Cam online but black / Plan B 640×480 / not primary | Stack free, play path wrong | **`MOB-APPLY mob-wall-play-wvp-flv-only-v1`** (M2) |
| Cam not online on WVP | BWC or proxy wrong | Fix key-in / restart order — **no new MOB yet** |

---

## Next MOB (when test says continue)

| Order | Name | When |
|-------|------|------|
| **M2** | `mob-wall-play-wvp-flv-only-v1` | Soft Open still not WVP native primary |
| M3 | `mob-ydt-stop-bridges-wvp-v1` | After M2 PASS — stop button → WVP stopPlay |
| M4 | `mob-ydt-telemetry-bridge-v1` | GPS / SOS / battery if broken after one-row |
| M5 | `mob-ptt-after-dual-protocol-v1` | Talk broken after split |
| M6 | `mob-retire-plan-b-wall-default-v1` | Genre cleanup after wall PASS |

**Default next code MOB = M2 only.** Skip M3–M6 until M2 prove.

One-row BWCs: M3/M4 may need a **different** path (msg WS / later) — do not invent a second SIP row. Disc those when M2 is done.

---

## Do not

- Type Fleet **5062** on the BWC  
- APPLY M2 before WVP shows the cam online  
- Jump to M3–M6 while picture is still Plan B

---

## One line

**Test M1 now (BWC→5060 WVP). Next code MOB = `mob-wall-play-wvp-flv-only-v1` only if Soft Open is not WVP primary.**
