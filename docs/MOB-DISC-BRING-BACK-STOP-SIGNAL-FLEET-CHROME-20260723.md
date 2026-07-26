# MOB DISC — Park companion · bring back Stopped by BWC / signal lost · Fleet chrome inventory

**Date:** 2026-07-23  
**Status:** DISC only — **no APPLY**  
**Operator:** Park companion battery / Record toast. Want **Stopped by BWC** and **Video signal lost** back. What else did we build for Fleet that is missing under WVP?  
**Park locked:** companion battery poll + Record-toast genre — **do not reopen** until you name them again.  
**Related:** `MOB-DISC-STOP-BATTERY-PARITY.md` · `MOB-DISC-WVP-HARM-100-CONSOLIDATION-FIX-PLAN-20260720.md` · `MOB-APPLIED-FLV-WALL-LIFECYCLE-PARITY-V1-20260720.md`

---

## Plain English

1. **Companion battery / Record toast** — **PARKED.**  
2. **Stopped by BWC / Video signal lost** — code for the **overlays still exists** (lifecycle parity made canvas **or** FLV `<video>` work). They are **quiet again** mainly because **WVP soft/hard-stop never fires** the Fleet event (`video-stream-stopped` + `device_bye`) that paints them.  
3. **Bring them back** = one named backend+UI wire MOB (below), **not** rebuild Fleet and **not** turn handoff off.  
4. Below is the **Fleet chrome / live inventory** from the Jul-20 harm list — what we already made, what still bites.

---

## Park list (do not touch)

| Item | Status |
|------|--------|
| Companion battery poll | **PARK** |
| Record button → toast / DeviceStatus REC | **PARK** |
| Hybrid private SIP SOS/PTT extensions | Already abandoned |

---

## Bring back: Stopped by BWC · Video signal lost

### What “Fleet last time” already shipped

| MOB | What it gave you |
|-----|------------------|
| **`FLV-WALL-LIFECYCLE-PARITY-V1`** (APPLIED 2026-07-20) | Wall/pin can show **Stopped by BWC** and **Video signal lost** on **FLV** (`video.me8-zlm-primary`), not only JSMpeg canvas. Stall watch ticks frames via `timeupdate`. |

So the **labels and overlays are not deleted**. They sit in `video-wall.js` (`markBwcStoppedOverlay`, `markVideoSignalLost`, stall timer).

### Why you don’t see them now

| Path | Classic Fleet | WVP handoff today |
|------|---------------|-------------------|
| Device ends live | SIP **BYE** → pool → `video-stream-stopped` `device_bye` → overlay | Often **no Fleet BYE** |
| Lab stop | — | Log: `wvp video handoff soft-stop` → `hard-stop` (`stopPlay`) — **no** `device_bye` emit |
| Stall (frozen picture) | Stall watch → Stopped by BWC | Only if `onVideoFrame` / prove still running; freeze may not fire if player keeps fake ticks |

**Root gap (from stop/battery disc):** `lib/wvpVideoHandoff.js` hard-stop does **not** tell the dashboard to paint chrome.

### Recommended next APPLY (when you want it)

**`MOB-APPLY WVP-HANDOFF-STOP-UI-PARITY-V1`**

- On WVP handoff **soft/hard-stop** (and operator-relevant stop reasons), emit the same socket classic used:  
  `video-stream-stopped` with `reason: 'device_bye'` (or `wvp_device_stop` mapped to the same UI branch).  
- Do **not** change INVITE / startPlay / FLV attach.  
- Do **not** reopen companion / hybrid SIP.  
- Prove: Soft Open live → stop on BWC (or dashboard stop that hits handoff) → wall shows **Stopped by BWC**; kill stream / long stall → **Video signal lost** or stall→stopped per existing policy.

Optional follow (same genre if needed): ensure stall `onVideoFrame` still fires under current mpegts player (if freeze never stalls).

---

## Fleet live chrome we made — inventory (check list)

From **WVP harm 100% consolidation** + later APPLYs. Status = operator-facing under handoff **now**.

### Lifecycle / wall chrome (your ask)

| Chrome | Built? | Working under handoff? | Notes |
|--------|--------|------------------------|-------|
| **Stopped by BWC** overlay | Yes (parity) | **PASS** 2026-07-23 | `WVP-HANDOFF-STOP-UI-PARITY-V1` |
| **Video signal lost** overlay | Yes (parity) | **PASS** (same MOB / stall path) | Same |
| Stall → stopped | Yes (parity) | **PASS** 2026-07-23 | Same |
| `device_bye` path | Yes (classic) | **Broken for WVP stops** | Pool BYE only |
| Operator Stop (dashboard) | Yes | Partial | Handoff `stopPlay` + UI teardown |
| Connecting… → Live | Yes (CW/FR/wall) | Mostly OK when picture works | |

### Surfaces (picture) — already finished genre

| Surface | Status (locked docs) |
|---------|----------------------|
| Ops wall FLV | Working when Soft Open OK |
| Command Wall FLV | **PASS** |
| FR live watch FLV | **PASS** |
| Panel popout / matrix FLV | **PASS** (+ close-safe) |
| Map pin FLV mirror | Harden attempted; layout genre messy — **not** reopen tonight |
| Wall listen audio | **PASS** 2026-07-22 |

### Still open / separate (not this stop toast MOB)

| Item | Notes |
|------|--------|
| Conference BWC ingress under handoff | Still needs WVP→LiveKit path |
| PTT `:29201` when WVP-homed | Ongoing reliability |
| Field PTT mesh / Call group | Separate genre |
| Panel 16:9 polish | Polish phase |
| Pin auto-open / dock storms | Layout genre — park unless you name it |
| Battery / Record toast | **PARKED** (companion) |
| Online/GPS warm | Warm MOBs exist; not toast chrome |

### Not harmed (don’t redo for this)

Login, Evidence, FR ledger, SOS cold banner path, Settings, WVP/ZLM infra, geofence (non-video).

---

## What else “Fleet last time” meant for operators (chrome family)

Same family as Stopped / signal lost — restore together if stop MOB opens:

1. **Stopped by BWC** (wall + pin when live was showing)  
2. **Video signal lost**  
3. **Stall → stopped** (cover lens / RTP die)  
4. Meta line on slot (“Stopped by BWC” / “Signal lost” text, not only frozen Live)  
5. Clean teardown so Play / Soft Open can start again without zombie FLV  

**Out of family** (do not bundle into stop MOB): companion battery, Record toast, Settings polish, hybrid SIP, pin layout rewrite.

---

## Recommendation (one path)

**Park companion.** Next product fix when you say go:

```text
MOB-APPLY WVP-HANDOFF-STOP-UI-PARITY-V1
```

That is the clean way to **bring back Stopped by BWC / Video signal lost** under WVP without turning handoff off and without rebuilding Fleet.

---

## One line

**Overlays already exist from lifecycle parity; they’re dark because WVP hard-stop never emits Fleet `device_bye`. Next APPLY: stop-UI parity. Companion battery/Record stays parked.**
