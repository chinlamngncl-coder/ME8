# MOB-APPLIED: mob-wvp-invite-rtp-answer-v1

**Date:** 2026-07-17  
**Status:** APPLIED (routing) · **Picture prove = FAIL tonight**  
**Goal:** Soft Open good path (`wvp-zlm primary`) — **not yet**

---

## What was broken (proved)

1. Mirror REGISTER made WVP show devices **online**, but peer was **Docker `172.21.0.1`**.  
2. Patching host to raw BWC LAN still left play as **`消息超时未回复`** (SIP no answer).  
3. Pointing WVP hostAddress at host **`:5061` proxy** without relay **looped INVITE back into WVP** (403 Forbidden).  
4. After relay: proxy log shows **`invite relay → cam`** + Via rewrite to `:5061` — INVITE leaves toward Chin/kk.  
5. WVP still logs **`点播失败 -1024:消息超时未回复`** — **camera does not answer WVP’s INVITE**.

Media node stays green (`me8-zlm-modern` status true). TCP-PASSIVE already on device rows.  
Fail is **SIP answer from BWC to WVP**, not “no ZLM” / not Plan B ffmpeg.

---

## What we changed

| File | Change |
|------|--------|
| `scripts/wvp-sip-lan-proxy.js` | INVITE/MESSAGE relay WVP→real BWC; hairpin from host LAN; **Via/Contact rewrite** to `192.168.1.38:5061` |
| `lib/wvpSipLanMap.js` | `proxySignalAddress()` — WVP must dial proxy, not Docker/BWC direct |
| `lib/wvpLabClient.js` | `updateDeviceInviteRoute` · `ensureInviteRtpReady` · startPlay/soft-try wire · sync → proxy route · TCP-PASSIVE |
| `lib/wvpRegisterMirror.js` | After mirror: keep real LAN in map; hostAddress = proxy |
| `lib/wvpDbLanPatch.js` | Also set `stream_mode=TCP-PASSIVE` |
| `server.js` | `POST /api/lab/wvp/prepare-invite-rtp` |

**Not changed:** Fleet SIP **5060**. No BWC port rewrite homework.

---

## Honest result

| Check | Result |
|-------|--------|
| Media online | PASS |
| Device online after mirror | PASS |
| hostAddress = proxy `:5061` | PASS |
| Proxy `invite relay → cam` | PASS |
| Cam SIP answer to WVP | **FAIL** |
| `live broker wvp-zlm primary` | **FAIL** (not seen) |
| Soft Open picture | Still Plan B / Fleet until cam answers WVP |

**Why cam silent:** Mirror REGISTER is **our software** saying “I’m the cam” to WVP. The real Chin/kk still live on **Fleet 5060**. They do not treat WVP’s INVITE as their platform call — so no 200 OK / no RTP to ZLM.

---

## Operator (plain)

1. Restart Fleet (picks up `server.js` / broker). Proxy already restarted with this MOB.  
2. Soft Open once — expect **still** fail-open Plan B unless log shows `wvp-zlm primary`.  
3. Pass only if panel is sharp **and** log has **`live broker wvp-zlm primary`**.  
4. Tonight’s agent prove: startPlay still **`receive_stream_timeout` / 消息超时未回复** after relay — do **not** call that a win.

Revert lane: `RUN RESTORE-ME8-PRE-GATE-C` — see `MOB-DISC-LIVE-STACK-REVERT-LATER.md`.

---

## Next MOB (when you APPLY — not auto)

Need a **real** WVP registration from the camera (or a lab cam pointed at WVP **5061**), not only Fleet mirror.  
Named later e.g. `mob-wvp-real-bwc-register-lab-v1` — **you** decide; no silent BWC config change.

---

## One line

**INVITE now exits Docker via host proxy to the cam; cam still does not answer WVP — mirror ≠ real register. Picture Plan A still FAIL.**
