# MOB DISC — Log now: ZLM-relay on **wall only** · pin different · res still broken

**Status:** LOCKED 2026-07-17 ~00:00  
**Search:** `confirm zlm`, `pin different`, `panel only`, `resolution still`  
**Boot:** 23:57 · play ~23:58

---

## Verdict (honest)

| Question | Answer |
|----------|--------|
| On ZLM? | **Yes — Plan B `zlm-relay`** (not WVP Plan A) |
| Proof | **`live broker zlm-relay primary` × 2** (chin + kk) |
| `wvp-zlm primary` | **0** — still not WVP→ZLM |
| Soft overlay where? | **Wall panel slots only** |
| Live pin | **Not** on soft ZLM overlay — stays Fleet JSMpeg / mirror path → **looks different** (expected with current code) |
| Resolution fixed? | **No.** Geometry MOB ran (`geometry: stable-v1`, primeBytes ~256k+) but log still has **`Invalid frame dimensions 0x0`** |

---

## Panel vs pin (why different)

| Surface | Path now |
|---------|----------|
| **Wall / panel** | Fleet invite → JSMpeg under → soft upgrade → **ZLM FLV overlay** (`zlm-relay primary`) + soft chase |
| **Live pin** | No `scheduleWallZlmSoftUpgrade` for map — **Fleet JSMpeg / canvas mirror** only |

So: yes — chase + soft ZLM were applied for **panel/wall**, not pin.  
Pin ≠ panel picture is **not mysterious**; it is **two players**.

---

## Resolution still changing (log)

```
zlm relay ffmpeg spawned … geometry: stable-v1 … primeBytes: 296852
… Invalid frame dimensions 0x0
live broker zlm-relay primary
```

Prime helped spawn; **0x0 decode warnings remain** → res/geometry still FAIL.  
Need a later named MOB (e.g. stronger prime / drop until valid size / fixed output size) — **not** claiming fixed tonight.

---

## You

- Panel = ZLM-relay soft (Plan B).  
- Pin = Fleet look — different until a pin soft-ZLM MOB.  
- Res = still not PASS.  

---

## One line

**Confirmed: wall on `zlm-relay` (not WVP). Pin not soft-ZLM. Res still broken (0x0 in log).**
