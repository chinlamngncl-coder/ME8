# MOB DISC — Soft Open FAIL: what now (2026-07-17)

**Status:** Paper only · **no APPLY** · no more guessing on the PC  
**You:** Soft Open = no video. Google pack already tried. Still FAIL.

---

## What now (3 steps)

1. **Copy the Google block** below → paste to Google (or your Google chat).  
2. **Wait for Google’s next named MOB(s).** Do not Soft Open-test hoping it “magically” works.  
3. When Google names a fix, you say **`MOB-APPLY …`** — one MOB at a time. Agent applies only that.

**Do not:** change BWC server IP · dual SIP rows · random port thrash · ask agent to “just try something.”

---

## Already tried (dead — do not redo)

| Tried | Still FAIL |
|-------|------------|
| Fix duplicate channels | Old bug gone |
| Soft Open = WVP only | Done |
| Wait 15s | Done · still `receive_stream_timeout` |
| Proxy forwards INVITE to cam | Done · **no cam 200 OK** |

---

## Copy to Google

```
Lab Soft Open still FAIL after your pack (WVP-only Soft Open + softTryMs=15000 + proxy INVITE relay).

Operator: click Soft Open → no video.

Logs (~2026-07-17 16:43 +08):
- WVP startPlay → receive_stream_timeout (code -2), softTryMs=15000
- Proxy: INVITE forwarded to Chin 192.168.1.131:46133 and kk 192.168.1.132:33881
- Proxy: NO "200 OK from cam → WVP"
- No "live broker wvp-zlm primary"

Stack: Windows. Host Node SIP proxy :5060 → WVP Docker :15061. ZLM in Docker.
BWC one server row only: 192.168.1.38 port 5060. Do not change BWC server IP.
WVP hostAddress = 192.168.1.38:5060 (invite via proxy). streamMode TCP-PASSIVE.
Suspicious: Chin REGISTER peer :59525 but INVITE sent to Contact/map :46133.

Need ONE next fix with a named MOB:
1) Why no SIP 200 after INVITE — wrong UDP port? Via? Cam silent?
2) Or RTP/media never reaches ZLM after 200 (TCP-PASSIVE / Docker)?
3) Exact next APPLY (one MOB). No dual SIP on BWC.
```

Full log disc: `MOB-DISC-SOFTOPEN-STILL-FAIL-RECEIVE-STREAM-20260717.md`

---

## Agent (until you APPLY)

- Read / logs / paper = OK  
- **No code change** until you say `MOB-APPLY …`

---

## One line

**What now = ask Google with the copy block · wait · then MOB-APPLY one named fix — not more thrash.**
