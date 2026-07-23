# MOB DISC — Log report: what Soft Open used (res + latency FAIL)

**Date:** 2026-07-17 (~01:47 old run · ~01:54–01:56 after discardcorrupt restart)  
**Source:** `storage/fleet.log`  
**Operator:** Calling OK · resolution change = **FAIL** · latency ≈ **10× FAIL**  
**Status:** Paper only — no APPLY

---

## Verdict (what you are watching)

| Layer | What log proves | Plan |
|-------|-----------------|------|
| Soft wall primary | **`live broker zlm-relay primary`** · `source: zlm-side-relay` | **Plan B** |
| Plan A | **Never** `live broker wvp-zlm primary` | **Not used** |
| Underlay | Fleet **pool** SIP + RTP `format: mpeg` + **pool ffmpeg** + JSMpeg WS | Fleet transitional |
| Soft overlay encode | Pool WS → **`libopenh264`** → RTMP `19350` → ZLM FLV | Plan B re-encode |

You are **not** on native GB H.264 from WVP/ZLM. Soft panel is **openh264 re-encode of the Fleet MPEG pool**.

---

## Cam map (this lab)

| Cam | deviceId suffix | Soft path tonight |
|-----|-----------------|-------------------|
| Chin | `…00008` | pool live → WVP soft skip → **zlm-relay primary** |
| kk | `…00009` | same |

---

## After discardcorrupt restart (01:54–01:56) — proof lines

### Chin (`…00008`)

1. `pool invite` / `pool rtp received` · `format: mpeg` · from `192.168.1.128`  
2. `pool ws first chunk` · **`clients:7`** (storm class)  
3. `live broker wvp soft skip` · `pool_already_live`  
4. `zlm relay ffmpeg spawned` · `geometry: native-no-scale-v1` · `discardcorrupt: true` · probe 10M  
5. `zlm relay native size log` · **`outWidth: 640` · `outHeight: 480`**  
6. WARN: `Invalid frame dimensions 0x0` (still)  
7. Later: `live broker zlm-relay primary` · `after: wvp_miss`

### kk (`…00009`)

Same pattern: pool mpeg → soft skip → relay spawn `native-no-scale-v1` → **native size log 640×480** → `zlm-relay primary`.

**No** `wvp-zlm primary` for either cam.

---

## Why resolution = FAIL (log, not guess)

| Fact | Meaning |
|------|---------|
| Size log **640×480** both cams | Probe sees **pool MPEG** geometry, not device 1080/4K native |
| Discardcorrupt **did apply** (`native-no-scale-v1`) | Still 640×480 — scale removal does not invent higher res from mpeg1/2 pool |
| Still `0x0` WARN | Junk headers remain; G3 did not clear geometry class |

Operator “resolution change failed” = **PASS as FAIL report**: Plan B cannot show true BWC res while input is Fleet pool MPEG at 640×480.

---

## Why latency ≈ 10× FAIL (log shape)

Pipeline in use:

```
BWC ──SIP/RTP mpeg──► Fleet pool ffmpeg ──WS──► zlm-relay libopenh264 ──RTMP──► ZLM ──FLV──► soft panel
         (+ JSMpeg underlay clients 6–10)
```

| Cost | Evidence |
|------|----------|
| Double encode | pool ffmpeg + openh264 again |
| Prime ~330KB before relay spawn | `primeBytes: 330692` / `335016` |
| 10M analyze/probe | intentional G3; adds open delay |
| Soft try / FLV ready waits | `zlm-relay not ready` then primary seconds later |
| WS client storm | Chin `clients:7`–`10`, kk `clients:6` |

Calling can feel “fine” (audio/SIP path) while **picture** is this heavy Plan B stack → latency FAIL is expected until Plan A (`wvp-zlm primary`) or abandon soft overlay.

---

## Earlier run (~01:47) before this restart

| Cam | Note |
|-----|------|
| kk | Still **`geometry: fixed-from-probe-v1` · 640×480** (pre–discardcorrupt binary) |
| Chin | Many `wvp_soft_try_timeout` while pool not live yet; then BYE / re-invite; pool `clients:10` |
| Both | Same Plan B class when soft primary appeared |

---

## Honest “are we cheating with ffmpeg?”

| Question | Answer from log |
|----------|-----------------|
| Is soft primary Fleet JSMpeg-only? | **No** after overlay settles — log says **`zlm-relay primary`** |
| Is underlay still pool ffmpeg? | **Yes** — `pool ffmpeg exit` on stop; RTP mpeg always |
| Is soft “WVP/ZLM native”? | **No** — never `wvp-zlm primary` |
| Is Chin “on ffmpeg cheating”? | Underlay = pool; soft = **openh264 Plan B**. Not Plan A. |

---

## Operator verdict lock

| Item | Result |
|------|--------|
| Calling | OK (operator) |
| Resolution | **FAIL** — log 640×480 Plan B |
| Latency | **FAIL** — Plan B double-encode + probe/prime |
| What we use | **Fleet pool + zlm-side-relay (openh264)** — not WVP Plan A |

Revert whole lane later: `docs/MOB-DISC-LIVE-STACK-REVERT-LATER.md` → `RUN RESTORE-ME8-PRE-GATE-C`.

---

## Next (only if you APPLY — not tonight auto)

- Plan A still owed: `mob-wvp-invite-rtp-answer-v1` (only path to native res / low latency soft)  
- Or stop soft overlay and stay Fleet JSMpeg (honest ops) — named MOB if you want  
- WS storm: `mob-wall-ws-client-cap-v1` (Firmware Gold file lock)

---

## One line

**Log: Soft Open = Plan B `zlm-relay` / openh264 / 640×480 — not WVP. Res + latency FAIL are that stack; calling OK does not change the picture path.**
