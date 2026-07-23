# MOB-APPLIED — Cold SOS proxy remarry Fleet :5062 (2026-07-20)

**APPLY:** `MOB-APPLY-COLD-SOS-PROXY-REMARRY-5062`  
**SUPERSEDED / REVERTED by:** `MOB-ARCH-REVERT-AND-UNIFY-EVENT-BUS` (SIP Layer-7 split abandoned)

## What changed

| File | Change |
|------|--------|
| `scripts/wvp-sip-lan-proxy.js` | Alarm MESSAGE → Fleet SIP `127.0.0.1:5062`; 200 OK back to cam; **not** to WVP; HTTP Alarm bridge **off** while flag on |
| `.env` | `FM_COLD_SOS_REMARRY_5062=1`, `FM_COLD_SOS_FLEET_SIP=127.0.0.1:5062` |
| `scripts/START-WVP-LAB.ps1` | Pass remarry env when restarting proxy |

**Not touched:** `deviceAlarm.js`, dashboard, `video-wall.js`, WVP/ZLM, PTT, Fleet SOS handler (gold path reused).

## Operator check (you)

1. Proxy already restarted by agent (or run `START-WVP-LAB.ps1 -RestartProxy` if needed).  
2. **Live:** open Chin → picture still OK? If no → STOP and tell Cursor.  
3. **Cold SOS:** cam not needed live → press physical SOS.  
4. Expect red SOS banner like classic. Tell Cursor: PASS / FAIL + which side silent.

## Agent log marks

- Proxy: `alarm remarry → Fleet SIP` / `Fleet reply → cam`  
- Fleet: `sip alarm notify received` / `sos-alarm pushed`  
- FAIL if no Alarm MESSAGE on proxy at all (cam never sent)  

## Off switch

`.env`: `FM_COLD_SOS_REMARRY_5062=0` → restart proxy only.
