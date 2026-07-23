# LOG PACK + DISC — Cold SOS PASS; voice stack FAIL (Google) — 2026-07-20

**Type:** DISC / log pack only — no APPLY  
**Operator correction:** Cam **009** SIP home is **:5060** (same as Chin 008), **not** Fleet :5062. Earlier “5062” note was wrong.

---

## One-screen matrix (current truth)

| Feature | Result | Log proof |
|---------|--------|-----------|
| **Cold SOS (cam button)** | **PASS** | `01:01:44` + `01:05:19` proxy `event-bus alarm` → `source:wvp_sip_proxy` → `sos-alarm pushed` · ack `01:01:53` / `01:05:31` |
| **Live video WVP/ZLM** | PASS (lobotomy) | `invite skipped` `wvp_fleet_invite_lobotomy` · `zlm-watch-active` · `wvp stopPlay` |
| **Cold PTT (cam button)** | **FAIL** | No separate PTT RX / talk-burst ingest from cam in window (only Alarm for SOS; group config noise to **29201**) |
| **Software Call** | **FAIL** (ear) | Fleet **does** run path: `start-bwc-call` → `voicePath:broadcast` `noSip:true` → `voice broadcast sent` — cam does not appear to talk |
| **Software PTT** | **FAIL** (ear) | `operator fleet ptt wake` only · **no** clear WVP `/api/play/broadcast` success/fail log after wake |

**Do not** credit 01:01 as “old Fleet :5062 gold.” Wire labels: **`wvp_sip_proxy`** via host proxy **:5060 → WVP**, then HTTP event bus → Fleet handlers.

---

## Corrected port model

```
Cam Chin 008 / 009  →  host :5060 (wvp-sip-lan-proxy)  →  WVP :15061
Fleet SIP :5062     = classic YDT / gold contact stack (NOT where tonight’s SOS Alarm landed)
Dashboard :3988     = event bus + Socket.IO
PTT TCP :29201      = Fleet still pushes group config (gtid 49) — cam may not bind while SIP-home is WVP
```

SOS path that **works**:

```
Cam Alarm MESSAGE :5060
  → proxy publishes POST /api/lab/wvp/events (type=alarm, source=wvp_sip_proxy)
  → Fleet raiseDeviceAlarm → sos-alarm socket
  → video INVITE lobotomized (correct)
```

Voice paths that **do not work** (operator):

```
Dash Call  → Fleet chooses broadcast / noSip  →  “voice broadcast sent”  →  no usable talk
Dash PTT   → ptt wake logged                   →  no proven WVP broadcast / PCM path
Cam PTT    → no Alarm-equivalent / no ptt-rx on bus in this window
```

---

## Timeline (+08) — keep for Google

```
01:01:44  ★ cold SOS 009 — proxy event-bus alarm 200 → device alarm wvp_sip_proxy → sos-alarm clients:1
01:01:45  WVP INVITE 100/200 on proxy (live pull after SOS) — Via :5060
01:01:53  sos acknowledged + sos response ptt team
01:03:23  software PTT wake 009 — then only group refresh / group config :29201
01:05:19  ★ second cold SOS 009 — proxy event-bus alarm again
01:05:31  sos acknowledged again
```

Earlier same session (008 Call/PTT):

```
00:59:09–15  PTT wake ×3 on 008
00:59:17     Call → broadcast / noSip / voice broadcast sent
```

---

## Questions for Google (voice stack only — SOS done)

1. With SIP home on WVP :5060 and Fleet video INVITE lobotomized, what is the **intended** dashboard Call path so the BWC ear hears desk audio — WVP `/api/play/broadcast`, ZLM talk, or Fleet TCP **29201** after group config?
2. Why does `operator fleet ptt wake` not show a following WVP broadcast API result — missing Phase-4 wire, silent fail, or UI not calling `ptt-start`?
3. Cold **cam PTT** on GB WVP home: what SIP/private signal should hit the proxy (if any), and should it POST `type=ptt` on the same event bus?
4. Is Fleet still sending `group config … port:29201` harmful/noise while cam expects WVP audio broadcast only?

---

## Files

| Path | Use |
|------|-----|
| This file | Paste to Google |
| `docs/MOB-DISC-FAIL-AGAIN-LOG-NO-ALARM-ON-WIRE-20260720.md` | Superseded on “5062 / SOS fail” — see correction below |
| `storage/fleet.log` | Raw |
| `storage/wvp-sip-lan-proxy.out.log` | Raw |

**No park. No code.** Named MOB-APPLY after Google reply.

---

## Extra for Google (code→log gap — soft PTT)

Fleet logs `operator fleet ptt wake` = socket `ptt-wake-device` only (push group + status).

Real dashboard talk = socket `ptt-start` → should log either:
- `operator talk start` with `wvpBroadcast` / `pttTcp`, or
- `talk blocked` `none_on_ptt_or_wvp`

In the fail windows (00:59 on 008, 01:03 on 009): **wake present, talk-start/blocked absent**.
So soft PTT may be stuck on wake-only UI path; Call is a different socket (`start-bwc-call` → `voice broadcast sent`).

Cold cam PTT: no matching proxy event / Fleet ptt-rx in this window (SOS Alarm ≠ PTT).
