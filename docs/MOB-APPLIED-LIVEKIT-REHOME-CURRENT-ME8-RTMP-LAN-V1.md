# MOB-APPLIED — LIVEKIT-REHOME-CURRENT-ME8-RTMP-LAN-V1

Applied: 2026-07-21

## Result

- LiveKit, Redis, Ingress, and Egress now run from this ME8 workspace:
  `docker/livekit.compose.yaml`.
- LiveKit now mounts this workspace's `docker/livekit.yaml`.
- New ingress URLs advertise the real LAN endpoint:
  `rtmp://192.168.1.38:1935/x/...`.
- The stale compose project rooted in `Mobility Test 2/Ubitron-ME8` is no longer active.
- WVP/ZLM and Fleet were not changed by this infrastructure rehome.

## Verification

- All four LiveKit services are running.
- TCP port 1935 is reachable on `192.168.1.38`.
- A create/delete ingress probe returned the current LAN RTMP address.
- The current and old browser conference application files have matching hashes:
  `public/js/conference-hub.js` and `public/js/conference-layout.js`.

## Pack lock

Video Conference must ship as one complete set:

1. Mobility Axiom/Fleet conference UI and backend.
2. LiveKit server, Redis, Ingress, and Egress runtime/configuration.
3. The Android Video Conference application (`MobilityConference-1.5.6.apk`, or its approved successor).

The Android Video Conference APK is not currently present in this workspace or elsewhere under the Desktop. Do not declare a Video Conference customer pack complete until the approved APK is restored and included at the pack root.
