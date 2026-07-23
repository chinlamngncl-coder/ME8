# MOB-APPLIED: mob-proxy-symmetric-nat-invite-v1

**Date:** 2026-07-17  
**Status:** APPLIED  
**Paper:** Soft Open still FAIL — INVITE went to Contact `:46133` while REGISTER peer was `:59525`

## Plain English

Cameras behind NAT only accept packets on the **same UDP hole** they used to REGISTER.  
We were sending Soft Open INVITE to the **Contact port** (wrong).  
Now INVITE goes to the **REGISTER peer port** (the NAT hole).

## What changed

| File | Change |
|------|--------|
| `scripts/wvp-sip-lan-proxy.js` | INVITE → last REGISTER peer IP:port (memory + map) |
| `lib/wvpSipLanMap.js` | Peer vs Contact stored separately · Contact cannot wipe peer |

## What you do (only this)

1. Double-click **`START-WVP-LAB.bat`** in the ME8 folder  
   (that runs the lab script + restarts the SIP proxy — you do **not** need to find a `.ps1`)  
2. Wait until Chin is online  
3. Soft Open Chin  

**Pass:**  
- Proxy log: `INVITE forwarded to BWC` **to = …:59525** (REGISTER peer — **not** `:46133`)  
- Proxy log: `200 OK from cam → WVP`  
- Picture / `live broker wvp-zlm primary`  

**Fail:** still INVITE to `:46133` or no video → tell agent.

## One line

**INVITE hits REGISTER peer NAT hole — not Contact port.**
