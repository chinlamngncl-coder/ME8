# MOB APPLIED — SOS ACK ends group call and restores PTT V1

**Date:** 2026-07-22  
**MOB:** `SOS-ACK-ENDS-GROUP-CALL-RESTORE-PTT-V1`

## Applied

- `/api/sos-acknowledge` now ends any active SOS group call with reason
  `sos_acknowledged` before returning success.
- Ending the call broadcasts `sos-group-call-state` so the CALL TEAM / END CALL
  UI and group microphone stop immediately.
- ACK response includes `endedGroupCall` so the dashboard can tell the operator
  that normal HQ PTT / Call are ready again.
- Audit records `sos.group_call.end` with reason `sos_acknowledged`.
- Audit labels added for SOS group call start/end.
- Existing hard blocks remain while a group call is still live; ACK is what
  clears that lock.

## Why

After ACK, the red pin blink lasts only 8 seconds (cosmetic). The PTT alert
`BWC is active in SOS group call` was caused by a leftover SIP group-call
session, not by the blink timer. Operators need to talk on normal HQ PTT/Call
immediately after acknowledging SOS.

## Verification

- `npm run verify:sos-ack-group-call`: PASS
- Full `npm run verify` includes the ACK wiring gate

## Operator prove (after service restart + one hard refresh)

1. Raise SOS → start **CALL TEAM** if used.
2. **ACK** the SOS.
3. Confirm toast/sidebar shows group call ended.
4. HQ **PTT** and **Call** must work without the group-call block message.
5. Red pin blink may still show for up to **8 seconds** — that is expected and
   must not block talk.

## Outside this MOB

- Remaining SIP `Math.random` sites in live modules
- Rebuild/verify ship `run.js`
- Valkey
