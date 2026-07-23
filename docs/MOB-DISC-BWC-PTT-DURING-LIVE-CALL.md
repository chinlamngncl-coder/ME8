# MOB DISC — BWC PTT during live Call (field → HQ)

**Status:** DISC — `mob-call-mic-hold` **ROLLED BACK** 2026-07-10 (operator rejected; Call stays always-on mic). **Do not propose hold-to-talk Call again.**  
**Date:** 2026-07-10  
**Trigger:** Cold PTT (no video) works; during live Call, BWC PTT does not. Fear that a restore broke core voice.  
**Search:** `BWC PTT`, `live Call`, `half-duplex`, `CallMic`, `voice call via ptt`, `rx from field`

---

## Verdict (read this first)

| Claim | Finding |
|-------|---------|
| “Restore broke PTT core” | **Not supported by file hashes** |
| “Agent changed `pttServer` / `ptt-rx` / `call-mic`” | **False** — byte-identical to **Firmware Gold** and **POC demo** |
| Live Call field→HQ path | **Designed** as BWC PTT uplink on same TCP as Call downlink |
| Most likely fail mode | **Half-duplex / continuous CallMic TX**, and/or **PTT TCP flap on live INVITE** — **not** a missing RX handler |
| Safe action now | **Do not restore. Do not restart.** One log-backed soak matrix below |

---

## Hash check (live tree vs baselines)

| File | vs Firmware Gold `2026-07-06` | vs POC demo `2026-07-09` |
|------|-------------------------------|---------------------------|
| `lib/pttServer.js` | **SAME** | **SAME** |
| `public/js/ptt-rx.js` | **SAME** | **SAME** |
| `public/js/call-mic.js` | **SAME** | **SAME** |
| `public/js/ptt-mic.js` | **SAME** | **SAME** |
| `lib/mediaSession.js` | **SAME** | **SAME** |
| `public/js/video-wall.js` | DIFF (pin/wall) | **SAME** (POC restore) |
| `public/js/fleet-ui.js` | DIFF | **SAME** (POC) |
| Call / `call-audio` / live PTT Call path in `server.js` | **Same logic as gold** | **Same as POC** |

`video-wall` / `fleet-ui` differ from gold because of the **POC wall restore** (pin/live), **not** because CallMic / PTT RX code changed. `onBwcCallState` → `CallMic.start` is the **same** in live, gold, and POC.

Server `emitPttRxAudio` is unchanged vs gold (still broadcasts every field uplink). POC-only add: `onPttRxActive` for missed-PTT ledger — does **not** mute audio.

**Conclusion:** Restoring gold/POC again will **not** invent a new field→HQ path. The behaviour you hit is in the **gold design** of live Call.

---

## How live Call actually works (day-one → now)

```
Live video up
    → Call button
    → pttVoiceCallCamId set  (“voice call via ptt”, preserveVideo)
    → CallMic ON continuously
    → call-audio → sendPttAudioToDevice  (HQ → BWC speaker, every ~20 ms)

BWC PTT button
    → same TCP 29201 uplink
    → handleInboundPttAudio → ptt-rx-audio → dashboard speakers
```

There is **no** second SIP talk channel on the usual live Call path. Comment in server: **“PTT TX only — no second SIP INVITE.”**

Cold PTT (no live): no CallMic flood, no live INVITE flap → field PTT works. That matches your soak.

---

## Why Call + BWC PTT fails (two mechanisms — both old)

### A. Continuous HQ downlink (half-duplex)

While Call is active, HQ mic streams **non-stop** over PTT TCP. Many BWCs are **half-duplex**: they will not uplink while receiving downlink. Cold PTT and hold-to-talk HQ PTT are bursty; Call is not.

**This is product/firmware behaviour, not a deleted handler.** Server never gates `emitPttRxAudio` on `pttVoiceCallCamId`.

### B. Live INVITE drops PTT TCP

Log (today) still shows the known pattern:

- live `invite` → `client disconnected` → `group refresh` → `login ok`

If the operator presses BWC PTT in the disconnect window, nothing reaches HQ. Cold (no video) never hits this.

### C. UI chrome only (does not kill audio)

`video-wall` hides map pin field-PTT chrome while `voiceCallCamId` is set (`rxLive = !onVoiceCall && …`). **Audio path in `ptt-rx.js` is not gated on Call.** If you heard nothing **and** log has no `rx from field started`, the packet never arrived (A or B). If log has RX but no sound, then dashboard audio — separate case.

---

## Log evidence (this lab, today)

Around the recent live window:

- PTT reconnect after invite: **present** (disconnect → login ok).
- `rx from field` at **18:45:15** on `…008` — **server did receive** field PTT at least once (after SOS / group talk, not clearly under Call).
- **No** `voice call via ptt` line found in the same 18:4x–18:5x Media slice searched — either Call was not started in that minute, or Media lines need a dedicated re-soak with eyes on the log.

**Do not treat “no Call line in one grep” as proof Call is broken** — re-soak with the matrix below.

---

## What must **not** be done

| Action | Why |
|--------|-----|
| Full `RESTORE` / fleet restart “to fix PTT” | Core PTT files already match gold/POC; risk 6th break of live/pin |
| Edit `pttServer.js` / `ptt-rx.js` without named MOB | Locked; high blast radius |
| Bundle pin + PTT + FR fixes | Violates one-MOB rule |

---

## Operator soak matrix (no code change)

Do these **in order**. Reply with PASS/FAIL per row.

| # | Setup | Action | PASS if |
|---|--------|--------|---------|
| 1 | **No** live, **no** Call | BWC PTT | HQ hears + toast/banner (you already PASS) |
| 2 | Live only, **no** Call | Wait 10s after picture; BWC PTT | HQ hears; log `rx from field started` |
| 3 | Live + Call | HQ silent 3s, then BWC PTT | HQ hears; log `rx from field` **while** Call active |
| 4 | Live + Call | HQ talking (CallMic hot), BWC PTT same time | Often FAIL on half-duplex — note it |
| 5 | Live + Call | End Call, immediately BWC PTT | Confirms channel recovers |

If **2 FAIL** → live INVITE / PTT flap (refresh timing), not CallMic.  
If **2 PASS, 3 FAIL, 4 FAIL** → half-duplex under continuous Call TX (design).  
If **3 PASS** → earlier soak was timing/UI; no code MOB.

---

## Future voice work

**Rejected forever (operator 2026-07-10):** hold-to-talk / VAD Call mic (`mob-call-mic-hold`). Call stays **always-on mic** when Call is active — do not propose cartoon radio Call UX again.

Other field→HQ ideas only if you name a MOB later. No soak matrix homework.

---

## Bottom line

PTT core was not deleted by restore. Live Call = continuous HQ mic by design. **`mob-call-mic-hold` rolled back.** Hard refresh to drop the hold button cache.
