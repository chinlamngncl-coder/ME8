# MOB DISC — Pre-ship live FAIL · record · solve **one by one**

**Status:** LOCKED 2026-07-17 ~01:42  
**Search:** `chin not up`, `STOPPED BY BWC`, `kk video start stop`, `google found`, `before ship`, `one by one`  
**Trigger:** Soft Open FAIL — Chin black “Live streaming…”, kk **STOPPED BY BWC**; both BWCs ONLINE on hardware  
**Ship rule:** No TOTP nag. This is the **live picture ledger** you ordered before launch.  
**Highest priority source:** `C:\Users\user\Desktop\LAST SHOT HARDENING.docx` → `MOB-DISC-LAST-SHOT-HARDENING-HIGHEST-PRIORITY.md` (outranks wake queues).

---

## Tonight on glass (your shot)

| Surface | What you saw | Hardware |
|---------|--------------|----------|
| Chin wall + pin | “Live streaming…” / no picture | BWC up |
| kk wall | **STOPPED BY BWC** | BWC up |
| Map | Chin + kk pins / PATROL | Online |

**Verdict:** Product live path FAIL. Not “operator wrong.”

---

## What the log says (~01:37–01:38) — agent proof

| Fact | Log |
|------|-----|
| Soft tries **WVP first** | `live broker fallback` · `wvp_startplay_failure` · **`receive_stream_timeout`** |
| WVP device row | `hostAddress` = LAN (`192.168.1.128` / `.78`) · `dockerHostSuspect:false` · but **`deviceOnline:false`** at play time |
| Fail-open Plan B | `zlm-relay` / pool — kk briefly `pool ws first chunk` with **`clients:6`** (storm class) |
| Chin | later **`pool remote bye`** (`dashboardActive:true`) — real SIP BYE, not only overlay |
| Operator stop | `stop-video from dashboard` also appears |

So: **WVP play still dead** (mirror REGISTER ≠ stream). Soft path **burns time on WVP timeout** before Fleet picture. kk overlay can be stall/BYE/storm. Afternoon class (stall / start-stop) can stack on top.

---

## What Google already found (keep — do not re-argue)

| # | Google / locked disc | ME8 status |
|---|----------------------|------------|
| G1 | ZLM keepalive → `media_server/list` status true | **PASS** (media-online) |
| G2 | Plan B: **openh264** (not blind libx264 copy) | Applied earlier |
| G3 | Plan B harden: **`discardcorrupt` + bigger probe · no hardcode scale** | **APPLIED 2026-07-17** → `MOB-APPLIED-ZLM-RELAY-DISCARDCORRUPT-V1.md` |
| G4 | Plan A TCP Passive on WVP play | Later — after stream works |
| G5 | Soft must not wait forever on dead startPlay | Still hurts — Chin stuck “Live streaming…” |

Refs: `MOB-DISC-GOOGLE-REPLY-KEEPALIVE-AND-PLAN-B-0x0.md`, `MOB-DISC-GOOGLE-REPLY-PLAN-A-B-COPY-VS-OPENH264.md`, `MOB-DISC-BWC-STOPPED-FLICKER.md`

---

## Pre-ship live ledger — solve **one MOB at a time** (order locked)

Do **not** bundle. You say **MOB-APPLY** for the next row only.

### L1 — Ops picture first (Fleet path must win fast)
**`mob-live-broker-failopen-fast-v1`** — **APPLIED 2026-07-17** → `MOB-APPLIED-LIVE-BROKER-FAILOPEN-FAST-V1.md`  
- Soft WVP try must fail-open to Fleet/ZLM-relay in **&lt;~2s**, not hang wall on `receive_stream_timeout`  
- Goal: Chin/kk show Fleet picture while WVP Plan A unfinished  
- **Does not** claim `wvp-zlm primary`

### L2 — Plan B stream harden (Google G3)
**`mob-zlm-relay-discardcorrupt-v1`** — **APPLIED 2026-07-17** → `MOB-APPLIED-ZLM-RELAY-DISCARDCORRUPT-V1.md`  
- ffmpeg: `+discardcorrupt`, bigger analyze/probe, **no** `-vf scale` hardcode  
- Keep libopenh264  
- Goal: stable Plan B when WVP dead  
- Full unwind later: `docs/MOB-DISC-LIVE-STACK-REVERT-LATER.md` → `RUN RESTORE-ME8-PRE-GATE-C`

### L3 — STOPPED BY BWC honesty
**`mob-wall-stopped-overlay-truth-v1`**  
- Split: real `device_bye` vs stall-watch vs operator stop  
- Stop lying “BWC stopped” when server still has RTP / or when stall from tab  
- Afternoon class from `MOB-DISC-BWC-STOPPED-FLICKER.md`

### L4 — WS client storm (clients:6 tonight)
**`mob-wall-ws-client-cap-v1`** (name when opened)  
- Healthy ≈ wall(+pin mirror) — not 6 JSMpeg attaches  
- Touch only with APPLY + named file (Firmware Gold lock on `video-wall.js`)

### L5 — WVP stream (Plan A) — after L1–L2 protect ops
**`mob-wvp-invite-rtp-answer-v1`** — **APPLIED 2026-07-17** (routing) · **picture FAIL** → `MOB-APPLIED-WVP-INVITE-RTP-ANSWER-V1.md`  
- Proxy INVITE relay + Via rewrite + hostAddress=`:5061` — INVITE reaches cam  
- Still **`消息超时未回复`** — mirror register ≠ cam answering WVP  
- Prove `wvp-zlm primary` **not** met — next needs real BWC→WVP register (named later)

### L6 — After Plan A once green
**`mob-wvp-play-tcp-passive-v1`** · then **`mob-wvp-zlm-post-stable-wall-fr-check-v1`**  
- Command wall + FR must not be sacrificed (`MOB-DISC-WVP-ZLM-MUST-NOT-SACRIFICE-WALL-FR.md`)

---

## Also on the desk (not tonight’s glass — still before customer ship)

| Lane | Note |
|------|------|
| Redact after-Save handoff | APPLIED — operator hard-refresh prove Finalize |
| Evidence redact enterprise | Honest: UI ≠ ship done |
| Companion / FR / security | Wake queues stay; open when you name them |
| Pre-ship checklist | Only when you say ship/pack — gate file, not daily nag |

---

## You now (one step)

1. Soft Open is expected FAIL until **L1** lands.  
2. Say **`MOB-APPLY mob-live-broker-failopen-fast-v1`** when ready — restore picture first.  
3. Then L2 → L3 → … one APPLY each.

Do **not** change BWC SIP 5060.

---

## One line

**Recorded: Chin hang + kk STOPPED BY BWC = WVP timeout blocking fail-open + storm/BYE/stall class. Google G3 still owed. Pre-ship order L1→L6 one MOB at a time — next APPLY = failopen-fast.**
