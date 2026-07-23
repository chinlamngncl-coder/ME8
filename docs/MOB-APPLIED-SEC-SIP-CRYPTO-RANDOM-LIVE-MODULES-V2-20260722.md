# MOB APPLIED — SIP crypto random live modules V2

**Date:** 2026-07-22  
**MOB:** `mob-sec-sip-crypto-random-live-modules-v2`

## Applied

Replaced remaining SIP session identifier generators that used `Math.random()`
in live modules with `lib/sipCryptoIdentifiers.js`:

| Module | Sites |
|--------|-------|
| `lib/deviceControl.js` | Call-ID, From-tag, DeviceControl SN, Broadcast SN |
| `lib/pttServer.js` | PTT group SIP MESSAGE Call-ID / tag |
| `lib/mediaSession.js` | voice/live INVITE Call-ID / tag |
| `lib/liveStreamPool.js` | live INVITE Call-ID / tag |
| `lib/sosResponseTeam.js` | SOS team SIP MESSAGE Call-ID / tag |
| `lib/frFieldAlert.js` | FR field alert SIP MESSAGE Call-ID / tag |
| `lib/conferenceBwcIngress.js` | conference INVITE Call-ID (`conf-` + UUID) / tag |
| `lib/wvpPttGroupRelay.js` | From-tag (Call-ID already used `crypto`) |

`createSipCallId(prefix)` now supports an optional safe prefix for conference
Call-IDs while keeping UUID entropy.

## Explicitly not changed

- `lib/sipServer.js` — Firmware Gold locked; not named in this APPLY
- `lib/sipGroupCall.js` — already used `crypto.randomBytes`
- `lib/fixedCamRegistry.js` / `lib/conferenceModule.js` share IDs — not SIP session IDs
- Ship bundle `run.js` — rebuild is the next MOB

## Verification

- `npm run verify:sip-crypto`: PASS
- Full `npm run verify`: PASS
- SOS group SIP call verification: PASS

## Operator smoke after restart

- One BWC Invite / Open All
- One PTT word
- One Call
- Optional: SOS ACK path already PASSed earlier today
