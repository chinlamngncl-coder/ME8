# MOB-APPLIED: mob-wvp-startplay-stack-fix-v1

**Date:** 2026-07-16  
**Status:** APPLIED (stack hygiene). **W4 play PASS not claimed** if cams are offline on WVP.

## Intent

Fix WVP↔ZLM startPlay hygiene that caused `SSRCInfo(port=-1)`, `createRTP` / “stream already exists”, and probe storms — without re-enabling ops ZLM-before-Fleet-invite.

## What changed

| File | Change |
|------|--------|
| `lib/wvpLabClient.js` | Per-device play lock; `preparePlaySlot` = stopPlay + ZLM `closeRtpServer` + 700ms; startPlay prepare → once → clean retry; `stackSelfcheck()` |
| `lib/livePlaybackBroker.js` | Single `startPlay` (cleanup owned by client) |
| `server.js` | `GET /api/lab/wvp/stack-selfcheck` |

Env (defaults match modern compose):

- `FM_WVP_ZLM_HTTP` → `http://127.0.0.1:18088`
- `FM_WVP_ZLM_SECRET` → `me8WvpZlmModern20260714Kx9m`
- `FM_WVP_ZLM_MEDIA_ID` → `me8-zlm-modern`

## Explicitly NOT changed

- Fleet SIP **5060** (unchanged; no dictate)
- Wall/pin ZLM-before-invite (stays reverted — ops FFmpeg invite path)
- Firmware Gold pin/wall cores
- Compose host-network / port-range miracle rewrites

## Honesty gate

- Stack `ok` = ZLM reachable + secret/id match + WVP login.
- `playReady` = stack ok **and** `devicesOnline > 0`.
- If WVP shows **0 online**, startPlay cannot succeed until a cam answers **WVP SIP 5061**. That is W3/W4 lab work — not fixed by this MOB alone.
- Ops live proof of WVP-ZLM remains only log line: `live broker wvp-zlm primary`.

## Operator check

1. Restart **UbitronC2** after pull.
2. Auth’d: `GET /api/lab/wvp/stack-selfcheck` → inspect `stack.ok`, `stack.playReady`, `hints`.
3. Do **not** expect wall/pin to go ZLM-first; ops path stays Fleet invite / FFmpeg until a later named MOB.

## Related discs

- `docs/MOB-DISC-WVP-STARTPLAY-HOW-NOT-MIRACLE.md` (W1–W5)
- `docs/MOB-DISC-REVERT-ZLM-BEFORE-INVITE-NOT-RESTORE.md`
- `docs/MOB-DISC-WVP-ZLM-GIVE-UP-PARKED.md`
