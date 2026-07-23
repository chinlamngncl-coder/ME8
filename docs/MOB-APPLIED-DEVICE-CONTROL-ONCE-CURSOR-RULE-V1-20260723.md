# MOB APPLIED — DEVICE-CONTROL-ONCE-CURSOR-RULE-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY DEVICE-CONTROL-ONCE-CURSOR-RULE-V1`  
**Disc:** `docs/MOB-DISC-DEVICE-CONTROL-PREVENTION-WHO-AND-HOW-20260723.md`

## What changed

Added always-on Cursor rule:

**`.cursor/rules/me8-device-control-once.mdc`**

- DeviceControl stays **`udp_once`**
- No `FM_DEVICE_CONTROL_SIP_TXN=1` for normal lab/ship
- No raw `sip.send` TakePicture/Record/Lock bypass
- Explains agent vs code prevention

## What did not change

Fleet runtime code — already PASS on `udp_once`. This MOB is **agent guardrail only**.

## Operator

No restart required for the rule.  
Next agent sessions load the rule automatically.
