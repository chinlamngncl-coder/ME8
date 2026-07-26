# MOB DISC — SEC 1.5 client URL + plain smoke

**Date:** 2026-07-25  
**Status:** DISC — **LOCKED**  
**Task:** `SEC-MSGWSS-HMAC-AUTH-V1`

## Device / companion connection URL

```text
ws://<LAN-IP>:6000/?user=<CAM_ID>&token=<HEX>
```

**Token:**

```text
hex( HMAC-SHA256( FM_MSGWSS_HMAC_SECRET , camId + "\n" + deviceSipPassword ) )
```

Example (illustrative only):

```text
ws://192.168.1.38:6000/?user=34020000001329000009&token=a1b2…64-hex-chars
```

Fleet pushes the same shape in **MsgServerUri** when the secret is configured.

Reject without valid token → socket close **4003** (not 4001).

## Operator PASS (plain — Disc `SEC-LAB-SMOKE-PLAIN-ENGLISH`)

Restart → open BWC → **video OK = PASS.**

Do **not** ask the operator to prove chat HMAC at the desk unless they say they use BWC messaging.
