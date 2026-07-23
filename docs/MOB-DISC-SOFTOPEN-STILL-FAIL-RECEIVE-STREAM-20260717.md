# MOB DISC — Soft Open still FAIL after Google pack (2026-07-17 ~16:43)

**Status:** FAIL locked · paper only · **no new APPLY**  
**Operator:** Soft Open → **no video**. Frustrated. Agent must speak plain.

---

## Plain English (read this first)

| Thing | What it is (one line) |
|-------|------------------------|
| **Soft Open** | You click the cam to watch live on the dashboard |
| **WVP** | The video server in Docker that talks GB28181 to the bodycam |
| **SIP proxy** | A small Node program on **this PC** that sits on port **5060** and passes SIP between the cam and WVP. **Not** the same as “restart WVP”. Started by `START-WVP-LAB.ps1`. |
| **Fleet** | The main Mobility Axiom Node app (dashboard) |

**What you see:** black / no picture.  
**What the log says:** WVP answered our play request with **stream receive timeout** (`receive_stream_timeout`). Picture never arrives.

---

## What we already did (Google pack) — honest

| Done | Result |
|------|--------|
| Soft Open = WVP only (stop Fleet double-INVITE) | Helped path clarity · **still no picture** |
| Wait 15 seconds (was 2s) | Budget is **15000** now · **still fails** |
| Proxy log for 200 OK | Proxy **forwards INVITE to cam** · **no `200 OK from cam` line** in this fail |

So: **timeout length and double-invite were not enough.** Next break is **cam answer / media (RTP)**, not “wait longer.”

---

## Exact fail (your test ~16:43–16:44 +08)

```
live broker fallback
  reason: wvp_soft_try_timeout
  msgKey: receive_stream_timeout
  wvpCode: -2
  softTryMs: 15000
```

Proxy (same window):

```
INVITE forwarded to BWC → 192.168.1.131:46133  (Chin)
INVITE forwarded to BWC → 192.168.1.132:33881  (kk)
```

**Missing:** any line `200 OK from cam → WVP`.

**Also missing:** `live broker wvp-zlm primary` (that line = real success).

---

## Simple meaning

1. PC **did** ask the cam to play (INVITE left the proxy toward the cam).  
2. WVP then waited for **video bytes** and gave up → **receive_stream_timeout**.  
3. Either the cam **did not answer** the INVITE, or the answer/video **did not come back** through the proxy / Docker path.

**Not** “GPS off.” **Not** the old TooManyResults channel bug.

**Suspicious detail:** Chin **REGISTER** peer port is **59525**, but INVITE is sent to map Contact port **46133**. If those ports are wrong/stale, INVITE goes to a dead UDP port → no 200 → no video.

---

## Ask Google (copy this)

```
After Soft Open pack (WVP-only Soft Open + softTryMs=15000 + proxy INVITE relay):

FAIL still: no video.
WVP startPlay → receive_stream_timeout (code -2), softTryMs=15000.
Proxy: INVITE forwarded to Chin 192.168.1.131:46133 and kk .132:33881.
Proxy: NO "200 OK from cam → WVP" logged.
No live broker wvp-zlm primary.

Stack: Windows host. SIP proxy Node :5060 → WVP Docker :15061. ZLM me8-zlm-modern.
BWC one row: server 192.168.1.38 port 5060. hostAddress intentionally 192.168.1.38:5060.
streamMode TCP-PASSIVE. REGISTER peer port ≠ INVITE target port (e.g. Chin REGISTER :59525 vs INVITE :46133).

Need:
1) Why no SIP 200 after INVITE forward — wrong Contact port? Via rewrite? Cam ignores?
2) After 200, how RTP/PS reaches ZLM under Docker Desktop (TCP-PASSIVE vs UDP)?
3) Correct next fix — Contact port from REGISTER peer, not stale map; or different streamMode; or RTP publish path.
Do NOT tell operator to put two SIP servers on the BWC.
```

---

## What operator should do now

**Nothing to click for a magic fix.** Soft Open will keep failing until Google’s next answer is APPLIED.

Optional check only: after Soft Open once, if you open  
`ME8\storage\wvp-sip-lan-proxy.out.log`  
and see **only** `INVITE forwarded` and **never** `200 OK from cam` — that matches this disc.

---

## One line

**Soft Open still black: WVP receive_stream_timeout after INVITE to cam — no SIP 200 back; Google pack (15s + WVP-only) did not fix media.**
