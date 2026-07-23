# MOB-DISC — Cold SOS OK; live + PTT dead (after ACL Step 1)

**Date:** 2026-07-20 ~14:05  
**Status:** DISC only — **no code**  
**Operator:** Cold SOS fine. No live video. PTT and the rest do not work.

---

## Verdict (one screen)

| Pipe | Result | Why |
|------|--------|-----|
| **Cold SOS** | **PASS** | Step 1 ACL: Alarm on **:5060** → event bus → classic `sos-alarm` |
| **Live video** | **FAIL** | Classic UI asks Fleet INVITE; `FM_LAB_WVP=0` → **no** Step 3 WVP/ZLM handoff; cams on WVP **:5060** do not answer Fleet **:5062** Play |
| **PTT / Call** | **FAIL** | Classic emits group config **29201**, but cam never becomes PTT-online (no TCP login) while SIP-home is WVP |
| **Frontend** | Frozen classic | Not the bug — backend pipes incomplete |

This is **not** “ACL broke SOS.” ACL is why cold SOS works.  
Live + talk were **never finished** on this split (Step 3 video not applied; Step 2 native PTT needs cam to open 29201).

---

## Log proof (~14:05)

| Signal | Meaning |
|--------|---------|
| `wvp acl presence → fleet` keepalive / heartbeat | ACL alive |
| `group config sent` gtid **49** port **29201** | Fleet still trying classic PTT wake |
| `invite requested` / `pool invite sending` then `invite skipped` `invite_in_flight` | Classic **Fleet video INVITE** path — stuck / useless for WVP-homed cams |
| `FM_LAB_WVP=0` | Lab WVP **video** preference off — Step 3 handoff **off** |
| No `login ok` / `client connected` on 29201 (same pattern as before) | Soft PTT cannot start |

**5060 unchanged** (proxy still the GB door). Problem is **which pipe** Open Live / PTT use after classic restore + ACL-only.

---

## Split-brain map (current)

```
SOS:     BWC Alarm → :5060 → ACL → classic sos-alarm     ✅
Live:    UI start-video → Fleet SIP INVITE (:5062 world) ❌  (need Step 3 → WVP startPlay → FLV)
PTT:     UI → group MESSAGE + wait 29201 login            ❌  (MESSAGE/TCP often ignored when cam trusts WVP only)
```

Classic PASS (Jul 18) had live+PTT because cams lived on Fleet **:5062**.  
Today cold SOS proves cams (or Alarm path) hit **:5060** + ACL. Same cam cannot magically answer classic Fleet Play/PTT without Step 3 / a working 29201 join.

---

## What we are **not** doing in this disc

- Touching frozen frontend  
- Calling this an SOS regression  
- “Go back” classic restore again  
- Re-opening WVP **audio** broadcast as PTT  

---

## Forward next (only when you APPLY)

| Order | Named work | Fixes |
|-------|------------|--------|
| **1** | **`MOB-APPLY-BACKEND-VIDEO-WVP-HANDOFF-V1`** (media-split Step 3) | Live: intercept classic `start-video` → WVP `startPlay` → FLV URL into classic player; skip Fleet video INVITE for WVP-homed cams. **No UI edit.** |
| **2** | After live PASS — PTT still dead | Forward fix so group config / 29201 login works **with** current SIP home (not WVP REST audio). Separate named APPLY. |

Do **not** bundle video + PTT in one freestyle.

---

## Operator ask

Say go ahead / **`MOB-APPLY-BACKEND-VIDEO-WVP-HANDOFF-V1`** when you want live next.  
PTT stays listed as known fail until its own APPLY after video.
