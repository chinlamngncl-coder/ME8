# MOB DISC — Log check: WVP/ZLM + cold SOS OK; stop one-by-one voice rewires

**Type:** DISC only — **no APPLY / no code**  
**Operator:** Cold SOS OK; do **not** want PTT / Call / grouping fixed one-by-one — “stack WVP/ZLM, Fleet functions should work”  
**Log window:** 2026-07-20 ~11:37–11:40 (+08)

---

## Short answers (from log)

| Question | Answer |
|----------|--------|
| Are we on **WVP/ZLM** for picture? | **YES** |
| Does **cold SOS** work? | **YES** (Chin 008 this morning) |
| Is redo PTT/Call/group **one-by-one** the right long plan? | **NO** — agree with you; that approach will miss features |

---

## Log proof (this morning)

### Cold SOS — PASS (WVP path, not Fleet :5062 Alarm)

```
11:37:56  device alarm raised  cam …008  source=wvp_sip_proxy
11:37:56  sos-alarm pushed     clients:1  independentOfFleetVideo:true
11:37:56  wvp event-bus alarm → fleet handlers  invite:false
proxy:    event-bus alarm → ME8 status=200  cameraId=…008
```

Hardware UDP SOS → proxy :5060 → event bus → Fleet gold SOS handlers. **Leave alone.**

### Live picture — WVP/ZLM (not Fleet INVITE)

```
11:37:56  invite skipped  reason=wvp_fleet_invite_lobotomy  trust=zlm-watch-active
11:37:59  zlm-watch-active  source=zlm-wvp  opsLive=true  invite:false
11:38:24  wvp stopPlay done  ok:true
proxy:    INVITE 100/200 from cam …008 via :5060 (WVP live pull)
```

### Voice UI-direct fired (API OK — product ear may still fail)

```
11:38:15 / 11:39:42  lab wvp broadcast start  path=same-origin-proxy  failed:[]
11:38:18 / 11:39:45  lab wvp broadcast stop
```

So the **HTTP proxy path ran**. That does **not** mean full Fleet voice/group suite is restored — only that broadcast start/stop was called.

### Residual 29201 noise (still appears)

```
11:38:45  group config sent  …008/…009  port:29201
```

Some SOS-team / other path still pushes 29201; zlm-watch refresh was correctly **skipped** (`group refresh skipped` `wvp_managed_voice_ui_direct`).

---

## Why “Fleet should just work on WVP/ZLM” is right — and what broke it

You are correct: **product face is Fleet**. Operators should not care that media is WVP/ZLM underneath. Fixing PTT, then Call, then group, then intercom… **will miss functions** and is not enterprise architecture.

What actually happened (split brain):

| Layer | Who owns it today | Status |
|-------|-------------------|--------|
| **Ops UI + SOS + roster + FR + GPS** | Fleet (UbitronC2) | Keep |
| **SIP home / GB REGISTER** | WVP via :5060 proxy | Required for picture |
| **Live picture** | ZLM via WVP play | PASS |
| **Cold SOS signal** | Proxy event-bus → Fleet handlers | PASS |
| **Classic voice** (PTT TCP 29201, Call SIP, group config) | Fleet assumed cam on Fleet SIP + PTT channel | **Broken** for WVP-homed cams |

WVP/ZLM under the floor **replaces the media plane**, not the product. But classic Fleet **voice** still assumes the old media plane (SIP contact + 29201). Stacking ZLM for **video** does not automatically rewire **audio**. That is the gap — not “Fleet UI is wrong.”

The recent `MOB-APPLY-VOICE-ONLY-UI-DIRECT` was a **surgical bypass** (UI → REST broadcast). Useful as a probe; **wrong as the long roadmap** if we keep patching each button.

---

## Strategic recommendation (DISC — no APPLY yet)

**Stop feature-by-feature UI rewires.**

Next named ARCH should be one of:

### A — Single voice adapter under Fleet (preferred direction)

Keep **all** existing Fleet sockets / UI (`ptt-start`, `start-bwc-call`, group, team, etc.).

Inside UbitronC2 only: if cam is WVP-managed → one **VoiceAdapter** translates those existing events to WVP audio APIs (and later mic uplink).  
Frontend stays gold Fleet. **Zero** “redo Call then PTT then group” in the browser.

### B — Park UI-direct; restore classic voice only when SIP-home is Fleet

Not your lab direction while Chin is on :5060.

### C — Continue UI-direct per button

**Reject** for product completeness (your point).

---

## What we do **not** touch while deciding

- Cold SOS / proxy / event bus  
- Live lobotomy / ZLM watch  
- FR / redaction / layouts  

---

## Bottom line

1. **Yes** — this morning’s log proves **WVP/ZLM live** + **cold SOS on event bus**.  
2. **Agree** — one-by-one PTT/Call/group rewires are not logical; we will miss functions.  
3. **Next** — discuss / name a **Fleet-side VoiceAdapter** MOB (backend translation of existing Fleet voice APIs), not more dashboard button surgery.

**No code in this DISC.** Say when you want `MOB-DISC` / `MOB-APPLY` for VoiceAdapter (or park UI-direct).
