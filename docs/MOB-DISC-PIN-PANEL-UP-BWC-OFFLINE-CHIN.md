# MOB DISC — Pin panel up but video shows **BWC Offline** (Chin vs kk)

**Status:** DISC only — no code  
**Date:** 2026-07-16 ~20:07  
**Search:** `BWC Offline`, `panel up no video`, `pin offline live stopped`, `stop-video no viewers`  
**Operator:** Panel is up — why is pin video offline?

---

## Short answer

**Popup open ≠ live video.**  
Chin (`…0008`) pin chrome stayed open; **live was stopped** on the Fleet side. kk (`…0009`) kept live (Stop live + picture).

Chin was **not** SIP-dead: DeviceStatus still `ONLINE` / telemetry still updating. The big **“BWC Offline”** box is the **map offline / no-live UI**, not proof the BWC unregistered.

---

## Log facts (same minute as screenshot)

| Time | Event |
|------|--------|
| 20:06:56–59 | Both cams `invite` + `pool rtp` (Fleet FFmpeg path) |
| 20:07:17 | Chin: `dashboard selected device` + **`pin-open`** fast status poll |
| **20:07:21** | Chin: **`stop-video from dashboard`** `surface:"ops"` → **`pool stop - no dashboard viewers`** → `pool stream stopped` |
| 20:07:22–24 | Chin re-invited (RTP back) — UI may still show offline shell if popup not rebuilt to live |
| Ongoing | Both: `live broker fallback` `wvp_startplay_failure` / `zlm_relay_inactive` — **not** WVP-ZLM primary |

Smoking gun:

```text
stop-video from dashboard | camId …00008 | surface ops | remainingViewers 0
pool stop - no dashboard viewers | camId …00008
```

So Chin’s video path was **released because ops said zero viewers** — not because the pin panel closed, and not because SIP went offline.

---

## Why the UI looks contradictory

| What you see | What it means |
|--------------|----------------|
| Pin **panel up** (name, PATROL, device time) | Leaflet popup / dock still open; SIP telemetry can still refresh |
| **BWC Offline** in video area | Offline / no-live pin template (`map.pin.bwcOffline`) — or live torn down with no mirror |
| kk **Stop live** + picture | That cam still has an active dashboard live session |

Code path for the label: `mapOfflinePopupHtml` when `FleetUi.isDeviceOnline` is false at popup build — **or** live teardown leaves the open popup without video. SIP `Online=ONLINE` can disagree with fleet table `status` / live-refcount for a moment. Label is easy to read as “device dead”; here the device was still answering SIP.

---

## Not the root for this screenshot

- Not “WVP :18080 UI vs Fleet” choice  
- Not kk killing Chin SIP  
- Not proof Chin BWC powered off  

WVP-ZLM soft try was **already failing** for both cams (`wvp_startplay_failure`) — rest of picture is still Fleet FFmpeg underlay; Chin’s underlay was stopped by **viewer count**.

---

## Product / next MOB (paper only)

Possible named follow-ups (need MOB-APPLY):

1. **`mob-pin-open-keep-live-refcount`** — pin-open / ops must not drop to `remainingViewers:0` while pin video panel is still open  
2. **`mob-pin-bwc-offline-label-honest`** — if SIP ONLINE but live stopped, show **Live stopped** / **Start live**, not **BWC Offline**  
3. WVP startPlay failure (`????` / `zlm_relay_inactive`) — separate WVP device-register / play diagnose (online rest-test path)

Do **not** treat this as “try the old tile again.”

---

## One line

**Chin panel stayed open; dashboard stopped Chin live (`no dashboard viewers`). Device still SIP online — “BWC Offline” on the pin is misleading UI, not a dead BWC.**
