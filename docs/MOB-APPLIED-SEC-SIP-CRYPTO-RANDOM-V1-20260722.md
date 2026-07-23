# MOB APPLIED — SIP cryptographic randomness V1

**Date:** 2026-07-22  
**MOB:** `mob-sec-sip-crypto-random`
**Scope:** Original Google finding in `server.js`

## Applied

- Replaced all four `server.js` SIP `Call-ID` generators that used
  `Math.random()` with `crypto.randomUUID()`.
- Replaced all four matching SIP From-tag generators with
  `crypto.randomInt()`.
- Replaced all three matching GB28181 XML sequence-number generators with
  `crypto.randomInt()`.
- Kept the existing decimal ranges for BWC compatibility.
- Added a reusable identifier module and a verification gate covering format,
  bounds, uniqueness sampling, exact call sites, and regression against
  reintroducing `Math.random()` at those sites.
- Did not modify locked `lib/sipServer.js`, `lib/pttServer.js`, PTT transport, or
  Firmware Gold snapshots.

## Verification

- SIP identifier security verification: PASS.
- SOS group SIP call verification: PASS.
- Full install, PostgreSQL retirement/legal, startup, rollback and fatal-process
  gates: PASS.
- Production npm audit: zero vulnerabilities.

## Legal notice impact

None. This uses the built-in Node.js `crypto` module and adds no dependency.

## Operator smoke after the next service restart

- One BWC registration and Invite.
- Open All.
- One PTT word.

