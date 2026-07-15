# MOB DISC — Reopen is a patch, not “stable” (honest)

**Status:** LOCKED talk — **no apply**  
**Date:** 2026-07-14  
**Search:** `reopen patch`, `why not stable`, `root fix`, `handover`

---

## You are right

**Auto-reopen is not solving why the stream dies.**  
It only **hides** the death: when Tile B drops, we call Play again and hope the picture comes back.

If we keep stacking patches and call that “stable,” that **is** bad — especially near handover.

| | Root fix | Reopen patch |
|---|----------|--------------|
| Goal | Stream **does not die** | Stream **comes back** after death |
| Operator | Sees continuous live | May see **blink / gap** |
| WVP/cam | One invite, steady read | **Extra Play** calls over time |
| Handover story | “Live works” | “Live usually works if we retry” |

We should **not** pretend reopen = solved.

---

## Why we still applied it (lab, near handover)

Not because it is the final answer.

Because you reported: **cam still live, tile dead** — a **player/read** failure, not “WVP is useless.”

For **testing today**:

- Latency path is already **PASS** (direct FLV + nomute-stall).
- Without reopen, one tile stays **black forever** while the BWC keeps recording — that blocks you from proving **two cams / scale** at all.
- Reopen is a **safety net** so the lab test can run **> 10 min** while we chase the **real** fix.

**Reopen = bandage for the prove window.**  
**Root fix = separate MOB genre** — must happen before we tell a customer “scale live is production-ready.”

---

## What is actually breaking (root classes)

Not one mystery bug — **stack mismatch**:

1. **WVP UI fast path ≠ our tile path**  
   WVP Play uses its own player stack. We use **mpegts + `<video>`** + extra hops. Different behavior under Opera private, two tiles, long watch.

2. **Browser kills or pauses the reader**  
   Chromium/Opera: muted live, tab focus, two `<video>` tags → reader stops → **ZLM drops the FLV player** while **cam push can continue**. Nomute-stall helped; did not eliminate.

3. **mpegts live has no proper long-session reconnect model**  
   Industry players (including many WVP deployments) **expect** reconnect for live. We added reopen because the library does not heal alone — but **ideal** is never needing it.

4. **Second concurrent stream**  
   Tile B (second Play) dying while A runs points at **WVP/ZLM or BWC under two invites** — not fixed by reopen logic alone.

5. **G.711 audio in FLV**  
   We strip audio (`hasAudio: false`) because MSE cannot decode G.711. That is correct for picture but adds edge cases.

Reopen does **none** of that. It only re-issues Play after the fact.

---

## What “actually stable” means (handover bar)

**Stable** = tile stays live **without** reopen storm for a normal watch session (e.g. **30+ min**, two tiles, Opera or customer browser class).

That requires **root MOBs**, e.g.:

| Root direction | Plain English |
|----------------|---------------|
| **Same player class as WVP** | Use what WVP UI uses for Play (often **ws-flv** / **fmp4** / bundled player — not our mpegts lab tile) |
| **Fewer hops** | Direct ZLM (started) — keep; drop proxy where possible |
| **Desk ZLM tune** | keepAlive / continue_push so one reader pause does not kill player while push continues — **agent owns** |
| **Track A vs B split** | Ops wall stays FFmpeg path; scale path is **WVP+ZLM class** — do not merge into Open All |
| **Not** | Forever increasing reopen count; `liveBufferLatencyChasing`; pool FFmpeg tee |

Named examples for later APPLY (talk only now):

- `mob-wvp-tile-ws-flv-player` — player swap, not more reopen  
- `mob-wvp-zlm-keepalive-desk` — server-side reader timeout tune (lab docker)  
- `mob-wvp-embed-native-play` — one panel uses WVP’s own play surface inside Fleet chrome  

---

## Is reopen “as bad” as leaving it broken?

**For handover product:** yes, **reopen-only is not enough** — you are correct.

**For lab today:** reopen is **less bad than** a frozen tile while the cam is fine — lets you finish **two-tile / latency** prove and keeps BWCs on test.

**Rule going forward:**

- Reopen stays **enabled in lab** until root player/path MOB **PASS** without needing retries in a 30 min soak.
- We **do not** ship “scale live” on reopen alone.
- If reopen fires **often** (every few min), that is **FAIL** — root fix MOB is mandatory, not optional.

---

## What you do / what I do

| You | Me |
|-----|-----|
| Soak test: Play A+B, leave running | If reopen spam or Tile B still dies → root MOB, not more reopen knobs |
| PASS/FAIL from picture | Own logs / desk config / player swap |
| Call out “patch not fix” (like now) | Document honestly — this disc |

No OSD. No client docs. No “measure with phone.”

---

## Summary one line

**Reopen is a lab safety net, not stability.**  
**Real stability = player/path aligned with WVP + server keepalive + two-stream soak PASS without constant retry.**

---

## Related

- Stability patches: `docs/MOB-DISC-WVP-TILE-STABILITY-FIX.md`  
- Latency (PASS): `docs/MOB-DISC-ZLM-LATENCY-HANDOVER.md`  
- Why WVP feels faster: `docs/MOB-DISC-WVP-TOP-SPEED-VS-WALL.md`
