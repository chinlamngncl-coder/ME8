# MOB DISC — Still not WVP-ZLM: **what / so what / how** (no more fog)

**Status:** DISC locked — diagnose complete  
**Date:** 2026-07-16  
**Search:** `still not wvp zlm`, `点播失败`, `消息超时未回复`, `-1024`, `startPlay timeout`  
**Operator:** “Still not WVP-ZLM so what? so how? what the fuck is this?”

---

## What this is (plain)

You are on **Fleet `:3988`**. Wall **does** ask WVP-ZLM now.

WVP **answers the API**, then **fails to get media from the BWC**:

```text
[点播失败]-1024:消息超时未回复
= Play failed: message timeout, device did not reply
deviceId / channelId = Chin or kk (…0008 / …0009)
```

Fleet log then shows (garbled Chinese → `????`):

```text
live broker fallback | wvp_startplay_failure
live broker fallback | zlm_relay_inactive
```

So video you see = **Fleet FFmpeg fallback**, not ZLM.  
**Zero** `live broker wvp-zlm primary` — correct honesty.

This is **not** “Docker down” anymore. WVP is up. **Play INVITE to the camera times out.**

---

## So what

| Layer | Status |
|-------|--------|
| Docker / `:18080` | Up |
| Fleet broker prefers WVP | Working (it calls startPlay) |
| Multi-cam soft gate | Working (it tries both cams) |
| **WVP ← BWC media** | **FAIL** — device no SIP reply to WVP play |
| What operator watches | FFmpeg underlay (looks like “live works”) |

**Looks online. Is not WVP-ZLM.** That mismatch is the fuck-up: product falls back quietly while the story is ZLM.

---

## Why the BWC does not answer WVP (lab fact)

Typical lab bind:

| Path | SIP | Who invites video |
|------|-----|-------------------|
| Fleet FFmpeg (what works) | **5060** | Fleet |
| WVP-ZLM play | **5061** | WVP |

Tonight: Fleet already `invite` + `pool rtp` on **5060**, then soft overlay asks WVP `startPlay` → WVP sends its own GB play → **超时未回复**.

So either:

1. Cam is **busy** on Fleet live and won’t answer a second play from WVP, and/or  
2. Cam is **not really registered / reachable for play on WVP 5061** the way WVP expects  

WVP UI showing a device row ≠ play succeeds.

---

## How (real path — no dictate 5060)

**Locked:** operator keeps Fleet SIP **5060** — `docs/MOB-DISC-NO-DICTATE-CHANGE-5060.md`

**APPLIED:** `mob-wvp-wall-zlm-before-ffmpeg-invite-v1` — wall probes WVP-ZLM **before** Fleet INVITE  
→ `docs/MOB-APPLIED-WVP-WALL-ZLM-BEFORE-FFMPEG-INVITE-V1.md`

Pass proof: `live broker wvp-zlm primary`. If still timeout after this MOB, diagnose WVP play — **do not** convert into “change your 5060.”

---

## What this is **not**

- Not another “open live and soak” while startPlay keeps timing out  
- Not “go use :18080 UI instead of Fleet” for rest of test  
- Not a wall soft-gate bug anymore — gate is asking; **WVP play to BWC** is the break  

---

## One line

**Fleet asks WVP; WVP play times out (`消息超时未回复`); you watch FFmpeg. Fix BWC↔WVP play (5061 / no dual-invite fight) — that is how ZLM actually happens.**
