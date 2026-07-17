# MOB DISC — Call audio-on vs live mute · BWC stop toilet · who put wrong thing in

**Date:** 2026-07-17  
**Status:** DISC — paper only — **no code**  
**Trigger:** Operator: (1) all calls designed to **auto mute** except SOS, PTT if someone wants to talk — but Call Chin = audio **on**; (2) stop from BWC **calls back** — unwanted; toilet break needs **Stopped by BWC** so HQ can PTT then Call when ready. “Why is my logic wrong now?”

**Search:** `Call auto mute`, `live mute SOS`, `Stopped by BWC toilet`, `call back after BYE`, `dashboardActive`

---

## Short verdict (read this first)

Your logic is **not all wrong**. Two different products got mixed in one sentence:

| Your words | What product meant for ~2 months | What happens when you **Call Chin** |
|------------|----------------------------------|-------------------------------------|
| “Auto mute except SOS; PTT to talk” | **Live video listen** (wall/pin speakers) | Not Call |
| Press **Call** | **Phone path** — HQ mic **on**, live RX **unmuted** | Audio **on by design** |

| Toilet / stop from BWC | Intended | Why it feels “wrong” now |
|------------------------|----------|---------------------------|
| BWC ends live | Show **Stopped by BWC**; **no** auto re-invite; HQ PTT OK; **manual** Play/Call when ready | Overlay can show, but HQ may still be “watching” → pool/WVP/Soft Open can **invite again** (“call back”) |

Tonight’s **`call-mic-always-on-restore`** only fixed Hold To Talk on Call. It did **not** invent Call audio-on, and it did **not** invent BWC call-back.

---

## 1) “Auto mute” — which genius / what is correct

### A. Live panel/pin audio = muted by default (except SOS) — **your design, still in code**

```1667:1672:public/js/video-wall.js
    function defaultAudioMutedForNewStream(slotKey, camId) {
        ...
        const autoUnmute = isSosCamForAudio(id);
        if (!camAudioMuted.has(id)) {
            camAudioMuted.set(id, !autoUnmute);
```

- Open live → speakers **muted** unless that cam is in SOS.  
- Want to hear live without Call → use **speaker / unmute** control, or **PTT** for talk.  
- SOS → auto unmute path (`unmuteAudioForSosCam`).

**This matches “auto mute except SOS + PTT if someone wants to talk” for live listen.**

### B. Call button = audio **on** — also long-term (not Soft Open, not Gold restore)

When Call goes active:

```1561:1568:public/js/video-wall.js
    function onBwcCallState(data) {
        ...
            setCamAudioMuted(data.camId, false);   // live RX unmute
            ...
                window.CallMic.start(data.camId); // HQ mic continuous TX
```

So “Call Chin → audio on” = **both**:

1. HQ → BWC: continuous `CallMic` / `call-audio`  
2. BWC → HQ: live listen forced unmuted for that cam  

**Locked on paper 2026-07-10** (`MOB-DISC-BWC-PTT-DURING-LIVE-CALL.md`): reject Call hold-to-talk; Call stays always-on mic.  
**APPLY 2026-07-17:** restore always-on `call-mic.js` (undo Jul-11 Hold UI smuggle).

### Who put Call “audio on” in (factual)

| When | Commit / event | Author stamp | What |
|------|----------------|--------------|------|
| **2026-07-02** | `b1027dc` | ME8 | `onBwcCallState` unmute + `CallMic.start`; `call-mic.js` phone/always-on; live mute-default except SOS |
| **2026-07-10** | Disc lock | Operator | Reject `mob-call-mic-hold` — Call stays always-on |
| **2026-07-11** | `3c865d9` | ME8 Firmware Gold (FR genre) | **Wrong for you** — re-inserts Hold To Talk on Call |
| **2026-07-17** | `MOB-APPLY call-mic-always-on-restore-jul10-lock` | Tonight | Puts Call mic back to always-on (Jul-10 lock) |

**Not the cause of “Call audio on”:** Soft Open restore, Firmware Gold pin pack, Pre-Gate-C wipe.

### If you now want Call ≠ open mic

That is a **new** product ask, **not** “restore mute.” It **conflicts** with Jul-10 lock + tonight’s APPLY.

| Intent | Needs |
|--------|--------|
| Live muted except SOS; PTT to talk; **Call** still phone always-on | **Already the locked model** — Call Chin **will** turn audio on |
| Live muted; **Call also muted** until PTT | New named MOB — must **explicitly override** Jul-10 Call lock — **do not freestyle** |

Say which of the two you want before any APPLY.

---

## 2) BWC stop → “calls back” — toilet break logic

### Your design (correct product story)

1. Wearer stops live on BWC (toilet / privacy / battery).  
2. HQ shows **Stopped by BWC** — not a bug to “fix” by pulling video again.  
3. HQ may **PTT** (“you OK?”).  
4. When wearer is ready → HQ **Play / Call** manually — **not** auto call-back.

Paper already said this for Soft Open toilet: `MOB-DISC-SOFTOPEN-STALL-PAUSE-RES-MULTI-SITE-20260717.md` — **device end = end; never auto re-invite against toilet stop.**

### What code actually does on real BWC BYE

1. Server: `liveStreamPool.onRemoteBye` → emit `video-stream-stopped` `{ reason: 'device_bye' }`  
2. Comment in pool: **keep session + `dashboardActive`** (so post-BYE SOS can still send `startVideo:false`)  
3. UI: `markBwcStoppedOverlay(camId)` — paints **Stopped by BWC**, kills players  
4. Overlay path **does not** clear watching / `stop-video` / release pool viewer  

So the **label** is right; the **watching latch** often stays true → later invite retry / Play / WVP reopen looks like **“it called back.”**

### Who / what fights toilet logic (most likely → least)

| Rank | Culprit | When | Why it feels like call-back |
|------|---------|------|-----------------------------|
| 1 | **`dashboardActive` kept after BYE** + no release on overlay | since `b1027dc` (2026-07-02); overlay `ae7d644` (2026-07-04) | Door open for later invite while “Stopped by BWC” shows |
| 2 | **`scheduleCooldownRetry` → `pool invite retry`** | `liveStreamPool.js` / `b1027dc` | Auto invite while still watching |
| 3 | **Soft Open ZLM keepalive / reopen** | Jul-17 MOB (then kill-storm) | Viewer “came back” without you clicking — **if Soft Open was on** |
| 4 | **Stall watch false “Stopped by BWC”** | `ae7d644` + flicker discs | Looks stopped then video returns **without** real BYE |
| 5 | **`relaunchVoiceBroadcastAfterDeviceBye`** | `server.js` / `b1027dc` | Only if symptom is **voice** retry during Call setup (BYE within ~8s) |

### Not the cause

- Tonight’s **CallMic always-on restore** — mic TX only; no live re-invite  
- Firmware Gold pin-mirror cores  

### Operator check (no APPLY) — names the path

After wearer stops on BWC, in `storage/fleet.log` look for order:

1. `pool remote bye` … `dashboardActive: true`  
2. Then **which** of: `pool invite retry` / `pool invite sending` / Soft Open / WVP startPlay / `voice broadcast retry after device bye`

That line = which “genius” path fired.

---

## Why it feels like “all my logic is wrong”

| Layer | Your logic | Code tonight |
|-------|------------|--------------|
| Live open | Mute except SOS | **Still true** |
| Talk without Call | PTT | **Still true** |
| Press **Call** | You may be thinking “still muted until PTT” | Code + Jul-10 lock: **audio on** (phone) |
| BWC toilet stop | Stay stopped; PTT; Call later | Overlay yes; **auto re-invite risk** while watching latch held |

So: live-mute logic is **yours and still there**. Call-on-Call and BWC call-back are **separate** — Call-on is intentional phone path; call-back is the **watching latch / retry / Soft Open reopen** class fighting toilet design.

---

## Lock / next (no freestyle)

1. Live panel unmute sticky — accepted fail; see `MOB-DISC-LIVE-PANEL-NOT-MUTE-OPERATOR-EVIDENCE-20260717.md` — mute APPLY only when named.  
2. **BWC stop auto call-back** — APPLY done: `MOB-APPLIED-BWC-STOP-NEVER-AUTO-CALLBACK-20260717.md`.  
3. Do **not** blind Gold restore for toilet / call-back.  

**Related:**  
`MOB-DISC-CALL-ALWAYS-ON-LONG-TERM-NOT-OLD-RESTORE-20260717.md`  
`MOB-DISC-BWC-PTT-DURING-LIVE-CALL.md`  
`MOB-DISC-SOFTOPEN-STALL-PAUSE-RES-MULTI-SITE-20260717.md`  
`MOB-DISC-LIVE-PANEL-NOT-MUTE-OPERATOR-EVIDENCE-20260717.md`  
`MOB-APPLIED-BWC-STOP-NEVER-AUTO-CALLBACK-20260717.md`
