# MOB DISC — SDP `RTP/AVP` vs `RTP/SAVP` vs BWC I-frame AES-256

**Date:** 2026-07-15 ~01:44  
**Status:** DISCUSSION only — **no APPLY**  
**Purpose:** Help agent / Google / desk **not confuse** three different “AES / secure video” layers.  
**Operator goal:** Get **AES-256** working; lab BWCs support **I-frame AES-256** (payload), not network SRTP.

---

## Plain English (give this to Google first)

When Fleet/WVP sends **SIP INVITE** for live video, camera answers **200 OK** with **SDP**. Look at the video line:

| SDP says | Means |
|----------|--------|
| `m=video <port> RTP/AVP …` | **Plain RTP profile** — packets are normal RTP. No SRTP at the transport. |
| `m=video <port> RTP/SAVP …` | **Secure RTP (SRTP)** — network-level crypto profile (+ usually `a=crypto:` / DTLS-SRTP). |

**Critical:**

> If the cam replies **`RTP/AVP`** but VLC/ffplay still show **scrambled / snow / no decode**, that does **not** prove SRTP.  
> It often means: **AES (or vendor cipher) is inside the payload** (e.g. encrypted **I-frames** / PS body), while RTP headers stay normal.

That is **exactly** the class our BWCs claim: **I-frame AES-256**, not `RTP/SAVP`.

---

## Three layers (do not mix)

```
┌─────────────────────────────────────────────────────────┐
│ L3  Evidence / vault AES-256-GCM (files at rest)         │  ← ME8 already has (evidenceCrypto)
├─────────────────────────────────────────────────────────┤
│ L2  SRTP / RTP/SAVP (+ a=crypto)                         │  ← network encrypt; SDP must say SAVP
├─────────────────────────────────────────────────────────┤
│ L1  Vendor I-frame / PS payload AES-256                   │  ← BWC: RTP/AVP + encrypted media bytes
└─────────────────────────────────────────────────────────┘
```

| Layer | What Google must check | Our BWC path |
|-------|------------------------|--------------|
| **L2 SRTP** | SDP `RTP/SAVP` + key lines | **Not** what cams offer if answer is `RTP/AVP` |
| **L1 I-frame AES** | Scramble with AVP; need **key + decrypt before decode** | **Target** |
| **L3 at-rest** | Encrypted files on disk | Different product (Evidence) |

Asking “enable SRTP” when cam only does **L1** = wrong rabbit hole.

---

## Diagnostic recipe (lab)

1. Capture SIP **200 OK** SDP for Invite/play (Fleet or WVP log / Wireshark filter `sip`).  
2. Read `m=video` protocol token.  
3. Branch:

| SDP | Picture on dumb player | Conclusion |
|-----|----------------------|------------|
| `RTP/SAVP` | Need SRTP stack | Network SRTP — wire SDES/DTLS correctly |
| `RTP/AVP` + clear H.264/PS | No stream crypto | Plain path (our current wall happy path) |
| `RTP/AVP` + scrambled / undecodable | **Payload AES (L1)** | Need vendor decrypt (I-frame AES-256 key exchange) — **not** ffmpeg “SRTP” |

4. Confirm with vendor doc: “I-frame encryption / AES-256 / GB28181 media encrypt” ≠ RFC 3711 SRTP.

---

## What ME8 does today (fact)

| Piece | Behavior |
|-------|----------|
| `lib/sdpMedia.js` / media SDP builders | Offer **`RTP/AVP`** or `TCP/RTP/AVP` — **not** SAVP |
| Live wall / ZLM / WVP Lab | Expect **clear** elementary stream after PS demux |
| Evidence AES-256-GCM | **L3** file crypto — unrelated to live RTP |

So: turning on cam **I-frame AES** without a decrypt step in the media path → wall/ZLM will look “broken / scrambled” even though SIP is healthy and SDP is AVP.

---

## What “AES-256 done” must mean for us

**Success = L1 pipeline**, not SAVP theater:

1. Cam encrypts I-frames (AES-256) per vendor.  
2. Platform receives **RTP/AVP** + encrypted payload.  
3. Before FFmpeg/ZLM/JSMpeg: **decrypt with shared key** (vendor API / SIP INFO / catalog / config — TBD by cam doc).  
4. Then demux/decode as today.

**Not success:** forcing `RTP/SAVP` in our SDP while cam never answers SAVP.  
**Not success:** confusing Evidence file AES with live stream AES.

---

## Help Google stay on rails (copy block)

```
We are NOT debugging SRTP unless SDP m=video says RTP/SAVP.
Our BWCs: I-frame AES-256 inside normal RTP/AVP.
If SDP is RTP/AVP and players scramble → payload crypto, not SAVP.
Do not recommend a=crypto/SDES as the first fix.
Next: vendor key exchange + decrypt-before-decode in the GB28181/PS path.
```

---

## Future MOB names (when cam doc + key ready — not tonight)

| MOB | Job |
|-----|-----|
| `mob-bwc-sdp-avp-savp-prove` | Log one 200 OK `m=video` line per cam (AVP vs SAVP) — paper/ops |
| `mob-bwc-iframe-aes256-decrypt` | Decrypt L1 before pool/ZLM (named files only after vendor spec) |

Security four-pack / soft-chase / Seeta = **other genres**. Do not bundle.

---

## One line

**SDP `RTP/AVP` + scramble = I-frame/payload AES, not SRTP; our BWCs are that class — Google must chase decrypt-before-decode, not SAVP.**
