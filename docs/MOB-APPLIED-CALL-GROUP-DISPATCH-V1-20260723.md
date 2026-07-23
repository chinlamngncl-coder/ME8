# MOB APPLIED — CALL-GROUP-DISPATCH-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY CALL-GROUP-DISPATCH-V1`  
**Disc:** `docs/MOB-DISC-CALL-GROUP-DISPATCH-AFTER-PTT-20260722.md`  
**Design:** Unified with **PTT Groups** (same `status-box` / chip / select chrome — not a one-off panel).

## What shipped

### Left panel — Call Groups (under PTT Groups)
- Same map-group select + fleet-tick chips (2+), Join / End
- Live banner when connected (discussion mic open until End)
- Does **not** regress PTT Groups Hold / mesh

### Backend
- `dispatch-call-group-start` / `stop` / `result`
- Reuses `lib/sipGroupCall.js` with `kind: 'dispatch'`, **no SOS alert tone**
- Mutually exclusive with SOS group call and 1:1 Call
- State still on `sos-group-call-state` (with `kind`)

### Wall / pin Call
- While call group live: Call on a **joined** cam Ends the group (owner); non-member → clear toast

## Operator verify

1. Restart Fleet + Ctrl+F5  
2. PTT Groups Join + Hold still works (**must not break**)  
3. Tick Chin+kk (or map group 2+) → **Join call group**  
4. Both hear HQ; HQ hears them (discussion)  
5. **End** → 1:1 Call + PTT still work  
6. Without Join, wall Call still 1:1  

**PASS** = all six feel right. **FAIL** = say which step broke.

## Files
- `lib/sipGroupCall.js`, `server.js`, `lib/auditActionLabels.js`
- `public/index.html`, `public/js/video-wall.js`, `public/locales/en.json`
