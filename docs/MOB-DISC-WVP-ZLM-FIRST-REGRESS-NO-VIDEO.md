# MOB DISC — Pin/wall ZLM-first APPLY **broke ops live** (FAIL)

**Status:** FAIL / REGRESS — locked 2026-07-16 ~20:40–20:42  
**Search:** `no video panel pin`, `can't call`, `zlm before invite regress`, `wvp ssrc`  
**Applies to:** `mob-wvp-pin-zlm-before-ffmpeg-invite-v1` (+ wall ZLM-first defer invite)  
**Operator report:** can't call · no video panel · no pin · waste of time

---

## Verdict (one line)

**WVP-ZLM still does not play. The ZLM-first APPLY deferred Fleet INVITE while probes failed → panel/pin black for a long time. Not ZLM. Ops live hurt.**

---

## Log proof (Fleet `storage/service-stdout.log`)

| Check | Result |
|-------|--------|
| `live broker wvp-zlm primary` | **0** |
| What ran ~20:40–20:41 | flood of `wvp_startplay_failure` (SSRC / play fail) + `zlm probe idle` |
| Fleet `invite requested` after APPLY | **blocked** until ~20:42:14 (minutes of black) |
| After finally inviting | `invite accepted` + `pool rtp received` (FFmpeg path) for …0008 / …0009 |

So: cams still answer Fleet on **5060**. Problem is **our order** (wait for dead WVP play), not “BWC offline.”

---

## Why panel + pin looked dead

1. `assignCamToSlot` **skipInvite** while ZLM helpers on.  
2. UI probes `/api/live/playback?noFfmpegStart=1` → WVP `startPlay` **fails** (SSRC / timeout class).  
3. Factory **retries** (×5) → long wait, **no** pool INVITE yet.  
4. Pin path waits on wall ZLM-first → same black.  
5. Only after probes give up → `inviteAfterZlmMiss` → FFmpeg. Too late / looks broken.

**Call:** same session — live/video path stuck in probe; voice/call feels dead with black panels. Not a separate mystery until live INVITE is restored first.

---

## What is NOT true

- This was **not** a successful WVP-ZLM bring-up.  
- RTP / invite alone ≠ ZLM.  
- Do **not** dictate changing operator SIP **5060**.

---

## Honest root (still open)

WVP `startPlay` to device fails even with Fleet idle (`ssrc` / play failure in WVP). Reordering invites cannot invent a working WVP play path.

---

## Next (needs explicit MOB-APPLY — no silent edit)

**`MOB-APPLY revert-wvp-zlm-before-invite-ops-v1`**

Revert pin+wall “ZLM before Fleet INVITE” so ops live invites **immediately** on FFmpeg again (pre-regress behavior).  
**Park** WVP-ZLM on Fleet wall/pin until WVP `startPlay` can produce `live broker wvp-zlm primary` in a **lab probe only** (not blocking ops).

---

## One line for operator

**ZLM-first APPLY failed ops. Revert restores panel/pin/call. WVP play still broken — park it.**
