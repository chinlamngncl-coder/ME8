# MOB DISC — Stop wasting operator soak time (WVP-ZLM preflight)

**Status:** DISC locked — agent rule  
**Date:** 2026-07-16  
**Search:** `waste of time`, `wvp down soak`, `preflight before test`, `no ffmpeg fake zlm`  
**Operator:** Angry — keep being asked / allowed to test BWC live when it is **not** WVP-ZLM. Waste of time.

---

## What wasted the time (facts)

| When | What operator did | What was actually true |
|------|-------------------|------------------------|
| Morning/mid soaks (2-cam) | Thought ZLM live test | Wall **blocked** multi-cam soft ZLM → **Fleet FFmpeg only** |
| After multi-cam gate APPLY (~14:20) | Opened 2 BWC live again | Wall **did** ask WVP — but **`ECONNREFUSED 127.0.0.1:18080`** → fallback FFmpeg for ~23 min |
| Evening check (~19:30) | “Test done — check WVP ZLM” | Still **zero** `live broker wvp-zlm primary` all day; Docker Desktop **down**; WVP **unreachable** |

So: operator burned soak time on **FFmpeg fallback** (or gate-blocked FFmpeg) while the product story was “test WVP-ZLM.” That is a **lab process failure**, not a BWC failure.

---

## Locked rule — **no soak ask without preflight**

Before agent says “open live / soak / check ZLM” (or treats an operator live run as a **WVP-ZLM** test):

**PASS all of these first (agent checks logs/HTTP/docker — operator does not guess):**

1. Docker Desktop / daemon up (WVP stack can run)  
2. WVP answers on lab port (**`127.0.0.1:18080`** or documented lab base) — not `ECONNREFUSED`  
3. WVP-ZLM companion healthy enough for `startPlay` (not only “Fleet routes enabled”)  
4. Fleet process has current wall + broker MOBs loaded  
5. Soft multi-cam path is the one under test (gate already lifted) **or** agent says clearly “this run is FFmpeg-only”

If any fail → **do not** ask for a ZLM soak. Say: **WVP/ZLM not up — fix stack first.**  
Do **not** let a long FFmpeg live session count as “WVP-ZLM testing.”

---

## Honesty during / after any live

| Log line | Meaning |
|----------|---------|
| `live broker wvp-zlm primary` | WVP-ZLM selected — only this counts as ZLM path |
| `wvp_startplay_failure` / `ECONNREFUSED …18080` | WVP **down** — session is **not** a ZLM test |
| `invite requested` / `pool rtp` only | Fleet FFmpeg underneath — say so immediately |

Agent must say the path in the **first sentence** of a log check. No soft “live looked ok.”

---

## Why we kept “testing” (root causes — locked)

1. **Product gate** (fixed later): multi-cam soft ZLM was off → FFmpeg soaks mislabeled.  
2. **Infra gap** (still): WVP Docker not running → broker correctly fell back; **agent still owed a hard stop** instead of more soak.  
3. **Process gap**: “open live and we’ll check logs” without **preflight** = operator time burned on known-fallback path.

Fix (1) without (2)+(3) still wastes soaks.

---

## Operator time budget (locked)

- **ZLM soak** = only after preflight PASS.  
- If WVP is down: agent’s job is **bring-up checklist / diagnose**, not “try live anyway.”  
- Mid-run discovery of `ECONNREFUSED` → tell operator **stop** (or keep FFmpeg only if they explicitly want FFmpeg), do not pretend ZLM.

---

## Related

- Honesty failure: `docs/MOB-DISC-WVP-FFMPEG-SOAKS-WERE-NOT-ZLM.md`  
- Priority: `docs/MOB-DISC-WVP-ZLM-PRIORITY-NOT-FFMPEG.md`  
- Multi-cam gate APPLY: `docs/MOB-APPLIED-WVP-WALL-MULTI-CAM-ZLM-V1.md`

---

## One line

**No more “test WVP-ZLM” while WVP is down or the wall never selects ZLM. Preflight first — operator soak time is not disposable.**
