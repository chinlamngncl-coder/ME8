# MOB DISC — Vendor GB + private protocol / SDK vs ME8 (can’t stop video)

**Date:** 2026-07-15 ~01:53  
**Status:** DISCUSSION only — **no APPLY**  
**Operator:** Vendor has own codes; can only pick **GB** or **GB + their protocols** for SDK. With their protocols, BWC **cannot stop video** after call (vendor dumb). Fear: using their protocol = **server mess**. Asked: is AES in the SDK/PDF?  
**Doc checked:** Desktop `智能执法仪软件协议说明书V1.3).pdf` (37 pages, text extract)

---

## Short answers

| Question | Answer |
|----------|--------|
| Is **I-frame AES-256** in this protocol PDF? | **Not found** — zero hits for `AES` / `加密` / I-frame encrypt in V1.3 text |
| Is AES inside ME8 tree SDK? | **No** live-stream AES module. `dockSdkAdapter.js` = **dock stub** only |
| Desktop RAR `…V2.03.41.rar` | Incomplete/corrupt list; contains vendor **PDF + big .exe** — not wired into ME8; can’t confirm AES from filenames |
| Should we run Mobility live on **GB + proprietary** so we can use their SDK? | **No as product core** — their “can’t stop video” is a **hard reject** for command-wall / multi-cam |

**Stay on plain GB28181 for Fleet / WVP live.** Treat vendor private stack as **optional side tool**, never merge into SIP/PTT gold path.

---

## What the V1.3 protocol book *does* say

Overall: **GB28181-shaped** + **private extensions** (BWC ≠ IPC/NVR); some standard device-control parts **dropped**.

Relevant media facts (not AES):

| Topic | Spec |
|-------|------|
| Voice/video call setup | SIP **INVITE** / **BYE** (documented) |
| UDP media | Normal RTP unpack |
| **TCP** media | Each RTP packet prefixed with **private** `HDA_NET_DATA` header (`0xfa,0xfb,0xfc,0xfd`, CMD video=0x3 / audio=0x4) |
| SDP example | `m=video … RTP/AVP 96` (AVP — aligns with “not SAVP”) |

So this manual is mostly **SIP + MANSCDP + TCP framing hack**, not an AES-256 design chapter. AES for I-frames is likely **cam menu / another API pack / closed .exe** — still **unproven on paper** until vendor points to a page or DLL API.

---

## Your stuck choice (honest framing)

```
                    Cam transport mode
                           │
         ┌─────────────────┴─────────────────┐
         │ GB only                           │ GB + vendor private (+ SDK)
         │                                   │
         ▼                                   ▼
   ME8 / WVP talk normal                  SDK / proprietary call works
   INVITE / BYE / Open All                BUT: video often WON'T STOP
   Wall proven tonight 1h PASS            → ops / multi-cam = landmine
         │                                   │
         └──────── product path ─────────────┘  do NOT fuse into server.js
```

**If you can’t stop video, you don’t ship that path as Live.** Period. Blame stays on vendor firmware/protocol, not “we must rewrite Fleet SIP to match their mess.”

---

## Why “their protocol on our server” is a mess (and we refuse to)

| Risk | Why |
|------|-----|
| Dual SIP dialects | Private TCP headers + CMD enums ≠ ZLM/Fleet RTP assumptions |
| Stop/BYE broken | Session leaks, RTP ports stuck, Open All death spiral |
| Firmware Gold / PTT | Touching live Invite path for vendor quirks = regression bomb |
| OEM / tender | Customer wants **GB28181 interoperable** story — not one-OEM SDK lock |

**ME8 rule:** one live language = **GB28181**. Vendor SDK = **sidecar or PC tool**, not the wall engine.

---

## Practical escapes (without marrying their stack)

1. **Ops:** Cam mode = **GB only** for ME8 lab/ship live (what passed 1h soak).  
2. **AES later:** Demand from vendor: *which document / API decrypts I-frame AES under pure GB?* If answer is “only with our private mode,” that is a **vendor tender defect** — escalate; don’t break our server.  
3. **Stop leak workaround (only if forced to use private for a demo):** never hold long sessions; power-cycle cam; one-cam only; document as **vendor FAIL** not ME8.  
4. **If vendor ever gives a clean Stop API:** optional `mob-vendor-hda-sidecar` (separate process) — **not** inside `sipServer.js` / wall Invite.

---

## Relation to SDP AVP vs AES disc

`MOB-DISC-BWC-SDP-AVP-VS-IFRAME-AES256.md` still holds: AVP ≠ SRTP.  
This disc adds: **AES is not in V1.3 protocol PDF**; **don’t enable private protocol just to chase SDK** while Stop is broken.

---

## Future named work (when vendor answers)

| MOB | Trigger |
|-----|---------|
| `mob-bwc-aes-vendor-doc-prove` | Vendor sends page/API that works on **GB-only** |
| `mob-vendor-hda-sidecar` | Only if private stack is mandatory **and** Stop is fixed |

Until then: **no** proprietary merge APPLY.

---

## One line

**V1.3 PDF has no AES chapter; private+SDK mode that can’t stop video must not enter ME8 live core — stay GB-only for product; AES needs vendor proof under pure GB, not a server rewrite.**
