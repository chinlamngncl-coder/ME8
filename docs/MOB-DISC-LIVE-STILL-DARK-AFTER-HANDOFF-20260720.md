# MOB-DISC — Live still dark after video handoff; SOS OK

**Date:** 2026-07-20 ~14:14  
**Status:** DISC only — **no code**  
**Operator:** Live doesn’t work. Cold SOS still works. Rest (PTT/Call/…) still nothing.

---

## Verdict

| Pipe | Status | Evidence |
|------|--------|----------|
| **Cold SOS** | **PASS** | ACL Alarm path still good |
| **Live handoff wire** | **Firing** | `invite skipped` `wvp_video_handoff` (no more Fleet 408) |
| **Live picture** | **FAIL** | Many `wvp video handoff startPlay fail` (WVP Chinese error text garbled in log); occasional start then quick **stop** |
| **PTT / Call / rest** | **FAIL** | Unchanged — not this APPLY |

So: handoff **replaced** dead Fleet INVITE, but **picture still fails** because WVP `startPlay` often errors under dashboard open storms, and/or frozen UI never gets a stable FLV overlay.

**Not an SOS regression.** Frontend still frozen.

---

## Log proof (your live try ~14:13–14:14)

1. Open live → `invite skipped` `reason:wvp_video_handoff` for Chin `…008` / KK `…009` (correct path).  
2. Repeated **`startPlay fail`** for `…009` (WVP msg mojibake — typical lab strings: play fail / stream timeout / **ssrc** conflict).  
3. One **`wvp video handoff start`** `…009` at `14:14:18` → **`handoff stop`** at `14:14:25` (~7s) — session torn down before/without lasting picture.  
4. Agent CLI `startPlay` a minute later → **OK** FLV URL — WVP can play when not slammed by multi open/stop.

**5060:** unchanged (still GB door). Fail is **WVP play API + UI attach**, not SIP port.

---

## Why picture stays dark (two layers)

### A — WVP `startPlay` unstable under Ops storm
Open All / dual open fires many handoffs + stops. WVP returns fail (ssrc / busy / timeout). UI gets `video-stream-error` or no usable FLV.

### B — Frozen classic UI still wants JSMpeg first
Classic wall: attach **JSMpeg** on Fleet pool WS (empty — no INVITE) → only then **soft ZLM overlay** after ~2s via `/api/live/playback`.  
Soft upgrade is **blocked for Open All / multi-tile**. Even when `startPlay` OK once, overlay path is fragile; FLV host may be `:80` rewrite (lab 80→ZLM) — browser must hit a working FLV port.

Agent does **not** change `public/**` in this disc.

---

## Split status (honest)

```
SOS:   :5060 Alarm → ACL → sos-alarm     ✅
Live:  start-video → skip INVITE → startPlay ⚠️ often fail / stop
       → classic soft-FLV attach            ⚠️ incomplete under freeze
PTT:   29201 login                          ❌ (later APPLY)
```

---

## Forward next (when you APPLY — pick one)

| Name | Intent |
|------|--------|
| **`MOB-APPLY-BACKEND-VIDEO-HANDOFF-STABLE-V1`** | Backend only: serialize startPlay, stop-before-restart, decode WVP error text, debounce Open All dual storm, keep FLV session until real stop; optional force FLV port **18088** if `:80` dark |
| UI unfreeze for direct FLV | **Forbidden** unless you explicitly lift frontend freeze |

PTT stays **out of scope** until live PASS.

---

## One line

Handoff path is on; live still dark because **WVP startPlay fails/stops under open storm** and frozen UI soft-FLV is weak — not because SOS broke. Say go ahead on **HANDOFF-STABLE** when ready.
