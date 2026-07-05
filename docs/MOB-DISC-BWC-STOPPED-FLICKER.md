# MOB DISC — “Stopped by BWC” flicker (bench)

**Status:** Open — intermittent; ask Google (see consolidated paste).  
**Search:** `Stopped by BWC`, `stoppedOnDevice`, `device_bye`, `stall`

---

## What the operator sees

Yellow **“Stopped by BWC”** on a wall panel (sometimes pin too) **once in a while** during Open All — stream may still be running or come back after restart. Feels unstable even after pin-mirror checkpoint PASS.

---

## What the code does (for agents — do not patch blind)

| Trigger | Path |
|---------|------|
| **SIP BYE** | Server `device_bye` → client `markBwcStoppedOverlay` |
| **~2.8s no frame** | `ensureBwcStallWatch` → same overlay |

Locked in Firmware Gold: `public/js/video-wall.js`, `server.js` pool BYE path.

**Do not MOB-APPLY** stall/BYE changes until Google answers in `docs/MOB-DISC-ASK-GOOGLE-ZLM.md`.

---

## Operator

Pass/fail only. If broken: tell agent **`RUN RESTORE-ME8-FIRMWARE-GOLD`**.
