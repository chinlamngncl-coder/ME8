# MOB DISC — FR field alert v1: SIP MESSAGE and/or short PTT to that BWC

**Status:** **APPLIED** `mob-fr-field-alert-ptt-or-msg` 2026-07-10 (manual button; auto still off)  
**Search:** FR alert field, MESSAGE, short PTT, blacklist catch, `sendPttAudioToDevice`, `Alert field`  
**Parent plan:** `MOB-DISC-FR-ALARM-FIELD-ALERT-PLAN.md`  
**Not in v1:** vibrate, silent auto-Call, SOS changes, `ptt-rx.js` / `ptt-start` edits

---

## Applied (safe scope)

| Piece | Change |
|-------|--------|
| `lib/frFieldAlert.js` | **New** — dual-beep alaw + optional `text/plain` SIP MESSAGE to **one** cam |
| `server.js` | Socket `fr-field-alert` only — calls `sendPttAudioToDevice` if PTT online; skips PTT if Call active on that cam |
| `fr-alarm.js` + `index.html` | **Alert field** button on red panel |
| Untouched | SOS handlers, `ptt-rx.js`, `pttServer.js` internals, `ptt-start` / `ptt-audio`, DeviceControl Alarm XML |

**Operator:** Restart fleet → hard refresh → get FR match → **Alert field** → hear beep if BWC on PTT; MESSAGE may or may not show on device UI.
---

## Locked product idea (your words)

> MESSAGE / short PTT to that BWC — best v1 path after bench.

When watchlist is **caught** on a cam, the **officer on that BWC** should get a clear field cue — not only a dashboard chime.

---

## Two channels (what we already have)

| Channel | Existing hook | What officer might hear/see |
|---------|---------------|-----------------------------|
| **A — Short PTT audio** | `pttServer.sendPttAudioToDevice(camId, alaw)` — same path as HQ talk / Call-over-PTT | Beep or short spoken cue in BWC earpiece/speaker **if** device is on PTT channel |
| **B — SIP MESSAGE** | We already send SIP `MESSAGE` (DeviceControl, group config, msg-server hints) | On-screen text **only if** this firmware shows custom notify text — **unproven** on your units |

**Voice broadcast** (`sendVoiceBroadcastForCam`) is a different animal (device may start audio INVITE) — **not** the first FR alert tool; too heavy / fights live.

---

## Recommended v1 behavior

```
FR blacklist hit (camId, displayName, score)
  → Dashboard: chime + red panel (already)
  → [Alert field] button on panel (operator)
  → Optional later: auto-alert setting OFF by default

Alert field (one cam only):
  1) If PTT online for camId → play short canned cue via sendPttAudioToDevice
  2) Also/or try SIP MESSAGE text (bench: does UI show it?)
  3) If neither works → toast on dashboard: “Field alert failed — BWC not on PTT / no contact”
```

| Rule | Locked |
|------|--------|
| Target | **Only** the catching `camId` — never blast whole group |
| Auto on every hit | **OFF** by default until soak PASS |
| During live Call on that cam | Prefer MESSAGE-only or skip PTT cue (avoid duplex fight) — decide after bench |
| Audit | `analytics.fr_field_alert` with camId, hitId, channel used |

---

## Bench plan (agent + you — before APPLY code)

Do this on **one** BWC (Chin), fleet idle or one live — **not** Open All storm.

| # | Test | Pass |
|---|------|------|
| B1 | Device on PTT; from server/tools play **1–2 s** tone/alaw to that camId | Officer hears cue |
| B2 | Same while Ops live video on that cam | Still hear / no black live |
| B3 | SIP MESSAGE with short body / Notify XML (lab payload) | Screen shows text **or** FAIL → drop MESSAGE for v1 |
| B4 | Device **not** on PTT | Dashboard shows clear fail; no crash |

**Only after B1 PASS** → implement UI button.  
**MESSAGE in product** only if B3 PASS.

---

## Suggested MOB (when you say APPLY — after bench)

**Name:** `mob-fr-field-alert-ptt-or-msg`

| Slice | Change |
|-------|--------|
| Server | `fr-field-alert` socket (or API): resolve contact + PTT online → short cue and/or MESSAGE; audit |
| Cue asset | Tiny canned alaw (beep or TTS “watchlist match”) under `storage/` or `public/audio/` — no new vendor SDK |
| UI | Red alarm panel: **Alert field** button |
| Settings (optional same or next MOB) | “Auto field alert on FR match” default **off** |

**Out of scope this MOB:** dossier/Watch live buttons, snapshot rolling, vibrate, auto-Call.

**Risk:** Med–High (PTT TX to field). One cam only. Do **not** touch `video-wall.js` / `ptt-rx.js` unless bench proves client must play the cue (server→device path preferred).

---

## Order vs other FR MOBs

| Order | MOB | Note |
|-------|-----|------|
| 1 | `mob-fr-snapshot-rolling` | More snaps — can stay parallel genre |
| 2 | `mob-fr-alarm-actions-dossier` | Open dossier / Watch live |
| **Bench B1–B4** | — | **Before** field-alert APPLY |
| 3 | **`mob-fr-field-alert-ptt-or-msg`** | This disc |
| Later | vibrate / confirm-Call | Parked |

---

## Bottom line

**Yes — MESSAGE + short PTT to that one BWC is the right v1 “caught” answer.**  
Bench PTT cue first; keep MESSAGE only if the device shows it. Operator **Alert field** button first; auto optional and off by default.

Reply when ready: run bench, or `MOB-APPLY mob-fr-field-alert-ptt-or-msg` after you confirm B1 (and B3 if you want MESSAGE).
