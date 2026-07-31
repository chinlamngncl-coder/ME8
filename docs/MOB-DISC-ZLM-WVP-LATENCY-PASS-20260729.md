# MOB DISC — ZLM / WVP latency: operator PASS (close park)

**Date:** 2026-07-29  
**Status:** **PASS — CLOSED** (operator statement)  
**Search:** ZLM latency, WVP latency, Gate B proxy, liveBufferLatencyChasing, parked latency  
**Operator:** “by the way, zlm wvp latency are all gone. it passed.”

---

## Plain answer

**Understood. Latency is PASS.**

Do **not** reopen ZLM/WVP latency tuning MOBs. Do **not** retry old player-buffer experiments. Do **not** treat latency as an open manuals or ship blocker.

---

## What this means

| Item | Status |
|------|--------|
| Live video latency (WVP/ZLM path) | **PASS** — operator confirmed “gone” / passed |
| Old park (“push toward ~2s / don’t tweak buffers”) | **Superseded by this PASS** for queue purposes |
| WVP/ZLM as video base | **Still ON** — latency PASS ≠ remove handoff / ≠ rip out ZLM |
| Forbidden reopen | `mpegts` liveBufferLatencyChasing / stash-off style tweaks that caused minutes lag before |

---

## Agent must NOT

- Start new “fix ZLM latency” MOBs unless operator reports a **new** regression  
- Say latency is still parked/pending in ordinary session openers  
- Use this PASS to justify turning off `FM_WVP_VIDEO_HANDOFF` or rewriting the video stack  
- Mix this with the rejected “Unified Dashboard / WebRTC Fan-Out / ripped out ZLM” paste — that paste stays **REJECTED**

---

## Manuals

No mandatory manual rewrite for latency PASS. Installation / Technical already point operators/IT to live view working; no “latency park” chapter required.

If a future Analytics or User chapter mentions live video delay, say only: ask IT if picture is slow — do not document internal ZLM buffer slang.

---

## Related

- Prior park note (historical): Gate B proxy ~8–10s lab; parked push to ~2s — **closed by operator PASS 2026-07-29**  
- WVP finish / no park handoff rules still apply for **product base**, not latency nag  

---

## Lock record

| Item | Result |
|------|--------|
| Operator | Latency all gone — **PASS** |
| Agent | Close latency queue item; do not reopen |
| Video base | WVP/ZLM remains |
| Code edits from this message | **None** |
