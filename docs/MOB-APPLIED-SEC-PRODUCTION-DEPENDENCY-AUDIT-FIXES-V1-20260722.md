# MOB APPLIED — Production dependency audit fixes V1

**Date:** 2026-07-22  
**MOB:** `mob-sec-production-dependency-audit-fixes-v1`  
**Scope:** Production npm dependency advisories only

## Applied

- Updated `tar` from 7.5.16 to 7.5.20.
- Updated `brace-expansion` from 1.1.15 to 1.1.16.
- Updated `body-parser` from 1.20.5 to 1.20.6.
- Kept `ftp-srv` 4.6.3 for BWC dock compatibility.
- Replaced `ftp-srv`'s abandoned vulnerable `ip` package with the API-compatible
  MIT-licensed `@webpod/ip` 0.6.1 through an npm override.
- Added a deterministic verification that checks the security version floors,
  FTP dependency resolution, IPv4/IPv4-mapped address equality, and `ftp-srv`
  module loading.
- Added `@webpod/ip` to both runtime and ship legal notices.

## Why `ftp-srv` was not downgraded

`npm audit` proposed `ftp-srv` 2.16.2 as its automatic remedy for the `ip`
advisory. That is a downgrade from 4.6.3 across major versions and risks the
working dock FTP ingress. The vulnerable utility was replaced directly while
preserving the current FTP server.

## Verification

- `npm audit --omit=dev`: zero vulnerabilities.
- `npm ci --ignore-scripts`: clean lockfile install, zero vulnerabilities.
- `npm run verify:dependencies`: PASS.
- `npm run verify`: install, PostgreSQL retirement/legal, startup and rollback gates PASS.

## Explicitly outside this MOB

The remaining source-code security MOBs are unchanged and must remain
one-at-a-time:

1. `mob-sec-uncaught-exit`
2. `mob-sec-sip-crypto-random`
3. `mob-sec-login-rate-lru`

