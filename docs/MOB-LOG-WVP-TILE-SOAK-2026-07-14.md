# LOG — WVP lab two-tile soak (2026-07-14 evening)

**Status:** FACTS from `docker logs me8-wvp` — not assumption  
**Operator:** Tile **A stayed**; Tile **B** stopped then came back (auto-reopen)  
**Source:** container `me8-wvp` (bundled ZLM inside WVP image — **not** Fleet `me8-zlm`)  
**Search:** `Tile B reopen`, `chin 0008`, `stamp expired`, `rtp丢包`

---

## Stream map (this lab)

| Device ID | Usual name | Typical tile |
|-----------|------------|--------------|
| `34020000001329000009` | kk | Tile A (first in list) |
| `34020000001329000008` | chin | Tile B |

---

## What the server logged (chin / Tile B)

**Player disconnect → new watch (matches “stopped then called back”):**

| Time (+08) | Event | Duration before drop |
|------------|--------|----------------------|
| ~19:32:54 | FLV player **disconnect** `…0008` — `recv close request from client` | **~229 s (~3.8 min)** |
| ~19:32:54 | ZLM `on_play` again for `…0008` | reopen / new Play |
| ~19:38:59 | FLV player **disconnect** `…0008` — `end of file` | **~364 s (~6.1 min)** |
| ~19:38:59 | ZLM `on_play` again for `…0008` | reopen again |
| ~20:00:11 | FLV player **disconnect** `…0008` — `end of file` | **~1272 s (~21 min)** |
| ~20:00:12 | WVP **stop play API** for `…0008` | end of session |
| ~20:00:27 | `RtpProcess timeout` `…0008` — RTP pusher gone after ~2978 s overall | media teardown |

**Verdict:** Tile B was **not** “still running the whole time.”  
ZLM shows the **browser FLV reader left**, then a **new play**, then left again. That is exactly auto-reopen / client close — **patch covering drops**, not an unbroken stream.

---

## What the server logged (kk / Tile A)

| Time | Event |
|------|--------|
| ~20:00:13 | FLV player disconnect `…0009` after **~2882 s (~48 min)** |
| ~20:00:13 | WVP stop play API for `…0009` |
| ~20:00:31 | `on_stream_none_reader` → **无人观看主动关闭流** for `…0009` |

**Verdict:** matches operator — **A held long**; closed when session ended / no reader.  
Not the same stop–restart pattern as chin in this window.

---

## Other facts in the same soak window

| Signal | Evidence |
|--------|----------|
| **Timestamp / stamp jitter** | Repeated `Stamp expired is not abnormal` / stamp thread warnings (~every 30s) while streams live |
| **RTP loss** | e.g. `rtp丢包` ~19:42, 19:48, 19:49 on MediaServer |
| **Early chin flaky** | ~19:28 many very short FLV player sessions (0–8 s) + snap pulls — before long soak segment |
| **Historical** | Many `RtpProcess timeout` on both cams earlier in the day (morning–afternoon) — cam/RTP path can die alone, not only browser |

---

## What this means (plain)

1. **B dropping is real in ZLM logs** — player EOF / client close, then new `on_play`.  
2. **“Came back” = reopen or new Play**, not continuous read.  
3. **A lasting ~48 min** = path *can* stay up; **B/chin was the weak side this soak**.  
4. Root candidates (next MOB genre — see Google check disc):  
   - browser/mpegts reader death → ZLM sees player gone  
   - stamp / RTP jitter on that cam  
   - ZLM/WVP timeout / stamp policy on **bundled** ZLM  
5. Reopen remains a **patch** (`MOB-DISC-WVP-REOPEN-IS-PATCH-NOT-STABLE.md`).

---

## Not checked (honest gaps)

- Browser DevTools / panel text (operator machine) — agent used **server** logs only  
- Fleet Node `wvp lab` lines — WVP+ZLM in `me8-wvp` is the authoritative media log for this Track B path  
- Exact which tile dropdown was A/B if swapped — timeline fits **chin=`…0008` = failing tile**

---

## Related disc

- Google ZLM config review: `docs/MOB-DISC-WVP-ZLM-CONFIG-GOOGLE-CHECK.md`  
- Reopen ≠ stable: `docs/MOB-DISC-WVP-REOPEN-IS-PATCH-NOT-STABLE.md`
