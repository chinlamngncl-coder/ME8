# MOB DISC — Refresh → alarm → ACK → stop Chin 08 → “dead” (2026-07-19 ~23:51)

**Type:** DISC only (no APPLY / no code change)  
**Cam:** Chin `34020000001329000008`  
**Operator:** `global`  
**Source log:** `storage/fleet.log` (+ proxy REGISTER only)

## What you saw

1. Refresh / come in → SOS alarm on screen  
2. ACK (note `ss`)  
3. Stop Chin 08  
4. After that → “does not work anymore” (live / reopen stuck)

## Verdict (from log)

| Step | What actually happened |
|------|------------------------|
| Alarm on refresh | **Not a new physical SOS.** Open incident from earlier lab smoke (`wvp_sip_proxy` ~23:07 / merge ~23:10) was still **unacknowledged**. On login, dashboard **replays** open SOS. |
| ACK | Real: `sos acknowledged` at **23:51:56** |
| Stop | Real: `stop-video` + `zlm-watch-unregister` + later `wvp stopPlay ok` |
| After stop | Fleet **video INVITE → 408**; stop was **deferred** while `invite_in_flight` — classic Fleet vs WVP split after stop |

Proxy log in this window: **REGISTER/tcp only** — no new Alarm MESSAGE at 23:51.

---

## Timeline (local +08)

| Time | Event |
|------|--------|
| 23:07:20 | Lab smoke: `device alarm raised` / `sos-alarm pushed` (source `wvp_sip_proxy`) — **left open** |
| 23:10:34 | Same incident **merged** (another smoke POST) — still open |
| **23:51:35** | ME8 process up (`wvp webhook adapter mounted`, dashboard listening) |
| **23:51:51** | `dashboard login` `global` |
| **23:51:52** | Live start race: `invite requested` Fleet + `login replay deferred` reason **`sos_incident`** (08 + 09) |
| **23:51:54** | `zlm-watch-active` opsLive (WVP/ZLM path, `invite:false`) |
| **23:51:56** | **`sos acknowledged`** note=`ss` + SOS PTT team push |
| **23:51:58** | **`stop-video from dashboard`** → `zlm-watch-unregister` → **`pool stop deferred` `invite_in_flight`** |
| 23:52:04 | `wvp stopPlay done` ok |
| **23:52:24** | **`invite failed` status 408** (Fleet SIP — cam is GB on :5060, not Fleet :5062) |
| 23:52:31–39 | Re-open attempt: Fleet invite again + zlm-watch → stop again → deferred → stopPlay |
| **23:53:03** | Another **`invite failed` 408** |

---

## Key log lines (copy)

```text
23:51:51.851  dashboard login | global
23:51:52.472  invite requested | cam …00008  mode=video
23:51:52.578  login replay deferred | reason=sos_incident
23:51:54.641  zlm-watch-active | opsLive=true invite=false source=zlm-wvp
23:51:56.298  sos acknowledged | note=ss
23:51:58.766  stop-video from dashboard | remainingViewers=0
23:51:58.768  pool stop deferred | invite_in_flight
23:51:58.771  zlm-watch-unregister
23:52:04.695  wvp stopPlay done | ok=true
23:52:24.483  invite failed | status=408
23:53:03.619  invite failed | status=408
```

---

## Why it feels “broken after stop”

1. **Stale SOS banner on refresh** — expected while an incident stays Open. ACK cleared that ledger row; it was not a fresh cam Alarm at 23:51.  
2. **Stop races Fleet INVITE** — dashboard still fired Fleet `invite requested` on pin/start even while ZLM/WVP watch was the picture path. Stop hit `invite_in_flight` → deferred pool stop → later **408**.  
3. **408 after stop** — Fleet :5062 path talking to a cam that registers on WVP proxy :5060. Picture path is WVP/ZLM; Fleet video INVITE often dies with 408. That matches “stop then nothing works” for reopen/Call-ish behavior.

Not shown in this window: new proxy Alarm bridge POST, or adapter `sos-alarm` at 23:51.

---

## What “does not work” likely means (confirm next)

Say which failed after stop:

- A) Live picture black / won’t reopen  
- B) Call / PTT  
- C) New physical SOS button  
- D) All of the above  

---

## Parked next (needs named APPLY — not done here)

- Do not auto-replay stale SOS after lab smoke without ACK (or auto-clear smoke incidents) — product choice  
- On ZLM/WVP ops-live: do not start Fleet video INVITE (already partly intended; race still logged)  
- Stop must cancel / not defer forever on `invite_in_flight` when operator clearly stopped  

**No code change in this DISC.**
