# MOB APPLIED — Fatal uncaught exit V1

**Date:** 2026-07-22  
**MOB:** `mob-sec-uncaught-exit`

## Applied

- Replaced the keep-alive handlers for `uncaughtException` and
  `unhandledRejection` with a shared fatal-process policy.
- A fatal event is logged once, sets exit code 1, and forces termination within
  25 ms so the service supervisor can restart a clean process.
- Duplicate fatal events cannot schedule competing exits.
- Preserved the narrow broken stdout/stderr `EPIPE` exception to prevent a
  recursive logging crash; it is not treated as corrupted application state.
- Added isolated child-process tests proving both fatal paths exit with code 1.
- Added checks that clean installs and transactional upgrades configure bounded
  Windows service recovery.

## Installed service recovery

The live `UbitronC2` service was running automatically but had no failure
actions configured. Its recovery policy was corrected without stopping it:

- first failure: restart after 5 seconds;
- second failure: restart after 15 seconds;
- later failures: no restart loop;
- failure counter reset: 24 hours;
- non-crash failure actions: enabled.

## Verification

- Fatal policy unit and real child-process exits: PASS.
- Installer and upgrade recovery-contract checks: PASS.
- Full install, PostgreSQL retirement/legal, startup and rollback gates: PASS.
- Production npm audit: zero vulnerabilities.

## Outside this MOB

- SIP random identifier hardening remains `mob-sec-sip-crypto-random`.
- Login limiter capacity hardening remains `mob-sec-login-rate-lru`.

