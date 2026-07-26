# MOB-APPLIED — SEC Phase 1.5 msgWss HMAC auth

**Date:** 2026-07-25  
**Task:** Phase 1 **1.5** — `SEC-MSGWSS-HMAC-AUTH-V1` (final SEC Google five)  
**Operator:** **PASS** (2026-07-25) — restart + BWC video OK  
**Roadmap:** `MOB-DISC-ARCHITECT-MASTER-ROADMAP-20260725.md`  
**Disc:** `MOB-DISC-SEC-GOOGLE-FIVE-TIMING-SPAWN-DISK-WS-20260724.md` (Task 5)  
**Smoke:** `MOB-DISC-SEC-LAB-SMOKE-PLAIN-ENGLISH-20260725.md`  
**Client URL:** `MOB-DISC-SEC-1-5-MSGWSS-HMAC-CLIENT-URL-20260725.md`

## Change

Known `user=CAM_ID` alone is **not** enough. msgWss requires a cryptographic `token=` (default on).

### Formula (locked)

```text
token = hex( HMAC-SHA256( FM_MSGWSS_HMAC_SECRET , camId + "\n" + deviceSipPassword ) )
```

- `deviceSipPassword` = BWC device `password` from catalog (`loadBwcDevices`)
- Compare with timing-safe digest equal (same idea as companion token)

### Close codes

| Code | Meaning |
|------|---------|
| 4000 | missing user |
| 4002 | unknown device |
| **4003** | Unauthorized (missing/bad token / secret not configured when required) |
| 4001 | camId already in use (unchanged) |

### Files

- `lib/msgWssAuth.js` (new)
- `server.js` — connection gate + `MsgServerUri` push includes `?user=&token=`
- `run.js` — rebuilt via `npm run build:runjs`
- `.env.example` — `FM_MSGWSS_HMAC_SECRET` / `FM_MSGWSS_REQUIRE_TOKEN`

**Verify:** `npm run verify:sec-msgwss-hmac`

### Env

| Var | Meaning |
|-----|---------|
| `FM_MSGWSS_HMAC_SECRET` | Server HMAC key (set a long random string for real messaging) |
| `FM_MSGWSS_REQUIRE_TOKEN` | Default **on**. Lab escape only: `=0` |

### Client / device URL

```text
ws://HOST:6000/?user=CAM_ID&token=HEX
```

Fleet also pushes that full URI in **MsgServerUri** (OnlineStatus + DeviceConfig hint) when the secret is set — so devices that use the URI get the token without computing HMAC themselves.

Companion / custom client that builds its own URL must use the same formula (needs secret + device SIP password).

## Operator smoke (plain)

1. Restart lab  
2. Open a BWC — **if video still works like before → PASS**

Video is SIP/live, not msgWss. Chat bind may need `FM_MSGWSS_HMAC_SECRET` set later — **not** this smoke.

Say **PASS** or **FAIL**. Do **not** start Phase 2 until PASS.

## Next (after PASS only)

Phase 1 SEC five complete → Phase 2 stays **PAUSED** until you open it.
