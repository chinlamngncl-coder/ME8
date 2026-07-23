# MOB DISC — Test result: SOS Chin vs KK; live OK; PTT/Call dead ear

**Type:** DISC only — **no APPLY / no code**  
**Operator:** SOS only Chin (ask: hardcoded? why KK same as Chin fails?); live OK; BWC PTT + software PTT + Call not working  
**Log window:** 2026-07-20 ~12:14–12:15 (+08)

---

## Short verdict

| Item | Verdict |
|------|---------|
| Chin hardcoded for SOS? | **No** |
| KK SOS same path? | **Same path** — and **this noon log shows KK SOS DID fire** |
| Live | **PASS** (ZLM / lobotomy) |
| Software PTT / Call | Adapter **starts OK** — ear still **FAIL** (broadcast open ≠ mic/audio into cam) |
| Cold BWC PTT button | **FAIL** (no inbound talk path on event bus — expected gap) |

---

## 1) Hardcode? — No

Env now:

```
FM_LAB_WVP=1
FM_SOFTOPEN_WVP_ONLY=0
FM_WVP_THIN_CAMS=          (empty)
FM_SEED_BWC_ID=            (empty)
```

SOS path is **not** Chin-only:

- Proxy: any cam Alarm MESSAGE on `:5060` → `event-bus alarm`  
- Fleet: `wvpEventBus` → `raiseDeviceAlarm` for **whatever cameraId** is in the packet  
- Invite lobotomy / VoiceAdapter: **all** WVP-lab BWCs, not `…008` only  

There is leftover *comment* history about “thin Chin” in docs/code, but **thin list is empty** — not gating SOS.

---

## 2) Why “only Chin” vs log — KK SOS at 12:14

```
12:14:44  device alarm raised  camId=…009  source=wvp_sip_proxy
12:14:44  sos-alarm pushed     clients:1
proxy:    event-bus alarm → ME8  cameraId=…009
```

So **KK (009) cold SOS hit Fleet this session.** Same stack as Chin.

If the **screen** felt like “only Chin”:

- Earlier presses on KK may have sent **no Alarm UDP** (cam/Wi‑Fi) while Chin did — not a Chin hardcode  
- Or banner/name mapping confusion (roster nick)  
- Or a press outside this window  

**Not** “code only allows Chin.” Next SOS fail on KK: we check proxy for `event-bus alarm` on `…009` that second.

---

## 3) Live — PASS (matches you)

```
12:14:46  zlm-watch-active  …009  source=zlm-wvp  invite:false
12:14:44  invite skipped    wvp_fleet_invite_lobotomy
12:15:43  wvp stopPlay done ok:true
```

---

## 4) Software PTT + Call — adapter ran; ear still dead

```
12:14:51  fleet voice adapter start  wvpStarted:1  …009
12:14:51  operator talk start        path=wvp-fleet-voice-adapter
12:15:00  start-bwc-call …009 → fleet voice adapter start wvpStarted:1
(repeat hold/release cycles 12:15:18–37)
```

**Meaning:** Fleet sockets → VoiceAdapter → WVP `/play/broadcast` **HTTP succeeded**.  
**Missing:** pushing desk **mic PCM into** that WVP/ZLM talk stream. Opening broadcast alone does not put your voice on the BWC speaker. Soft PTT/`call-audio` currently **do not** uplink into WVP (by design in V1 to avoid 29201 spam).

So: **not** “adapter never called” — **media uplink not finished.**

---

## 5) Cold PTT on BWC

No proxy/Fleet “ptt-rx” / talk-burst from cam button in this window.  
Cold **SOS** = Alarm MESSAGE. Cold **PTT** is a different signal (often not on the same Alarm wire). Unchanged gap — not Chin hardcode.

---

## Decided next (one path — when you APPLY)

**`MOB-APPLY-FLEET-VOICE-ADAPTER-UPLINK-V1`** (name locked for later)

Finish VoiceAdapter: after WVP broadcast start, push operator mic (`ptt-audio` / `call-audio`) into WVP/ZLM talk path so cam **ear** hears desk.  
Keep SOS/live alone. No button-by-button UI redo. No park menu.

SOS Chin vs KK: **no code change** unless a later log shows Alarm missing for KK only — then cam/wire, not hardcode.

---

## Bottom line

1. **Not hardcoded to Chin.**  
2. **KK SOS worked in log at 12:14:44** on the same path.  
3. **Live OK.**  
4. **PTT/Call:** adapter OK, **ear FAIL** until mic uplink MOB.  

**No code.** Say go ahead / APPLY uplink when ready.
