# MOB DISC — How to fix the ~1 min mid-soak break

**Date:** 2026-07-15  
**Builds on:** `MOB-DISC-WVP-MODERN-SOAK-HOLD-VS-BREAK.md`  
**Status:** DISCUSSION only — no code until named `MOB-APPLY`  
**Evidence:** `docker logs me8-wvp` + `me8-wvp-zlm` around **23:32**

---

## What actually happened (not guess)

**Break length:** ~1 min (kk ~44 s, chin ~52 s).  
**Not:** stamp alone, none-reader timeout, or “ZLM dying at 25 min.”

### Smoking gun in WVP log

| Time | Event |
|------|--------|
| **23:32:05.727** | kk: **`[收到bye]`** from device `…0009`, type **PLAY** |
| 23:32:05.742 | ZLM: RTP **Server shutdown** → 媒体注销 |
| **23:32:13** | chin: **BYE PLAY** + cam **注销请求** → closeRtp |
| 23:32:47 / 23:33:03 | Lab/WVP **`[开始点播]`** again → media back |

So: **cameras sent SIP BYE** on the live pull after ~**24 min**. WVP closed RTP. UI later **re-played**. Gap ≈ re-invite time.

End at **23:57–58** is different: WVP **`[停止点播]`** (you/stop path) — not the mid-soak bug.

---

## What we are *not* solving with first

| Idea | Why park |
|------|----------|
| Fossil-style `modifyStamp` / stamp tune | Already **FAIL** once (lag + stop). Stamp spam still noise; BYE is the break. |
| Raise `streamNoneReaderDelayMS` | Player was still attached when RTP shut; BYE came first. |
| Blame “49 vs 25” confusion | Break = **~1 min**; 24/25 = **hold** lengths. |

---

## Ways to solve (ranked)

### A — Confirm cam session limit (root on glass)

Both cams BYE’d within **~8 s** of each other after ~**1418–1420 s** record (~**23.6 min**).  
Looks like **same BWC firmware / SIP session ceiling**, not random Wi‑Fi flake.

**Operator / cam UI dig (no ME8 code):**  
- SIP / preview / “max play” / session expire on kk + chin  
- Raise or disable if the menu exists  

**PASS:** second soak **60+ min** with **zero** mid-session `[收到bye]` / 媒体注销.

### B — Soft fix on Track B UI (hide the 1 min)

If cam still BYEs: Lab tiles **auto re-Play** already (you got picture back). Harden so black ≈ **&lt;3–5 s**, not ~1 min.

Named later: `mob-wvp-lab-auto-replay-after-bye`  
- Detect play fail / stream gone → re-call start play once  
- Backoff so no storm  

**PASS:** operator sees at most a short blink; log may still show BYE + re-点播.

### C — Soft fix on WVP (platform re-invite)

WVP **`auto-apply-play`** is already true; still waited for a new **开始点播** (~40 s) — likely tile/API, not ZLM.

Optional later: on stream-gone hook after unexpected BYE, WVP (or Fleet proxy) **auto re-invite** without waiting for click.

**Risk:** fighting intentional Stop; need “user stopped” vs “cam BYE” distinction.

### D — Accept for lab, measure for scale

For **2-cam lab**: 1 min blink every ~25 min may be OK if B auto-replay is tight.  
For **hundreds of cams**: A first (firmware), then B/C — do not stamp-chase.

---

## Recommended order (one MOB at a time)

1. **You:** next soak — watch whether black coincides with ~25 min; note if cam NVR shows session timeout.  
2. **`mob-wvp-soak-bye-prove`** (paper/log only): script or checklist — next soak dump WVP lines with `收到bye` / `开始点播` only. Confirm BYE is repeatable at ~24 min.  
3. If repeatable → **A** (cam) if you can change cams; else **`mob-wvp-lab-auto-replay-after-bye`**.  
4. Do **not** open stamp MOB for this break unless prove-byes finds **no** BYE and only stamp/RTP mess.

---

## One line

**Cameras BYE’d the play at ~24 min; fix the cam session limit if possible, else make Lab auto re-play fast so the ~1 min hole becomes a blink — do not stamp-tune that break.**
