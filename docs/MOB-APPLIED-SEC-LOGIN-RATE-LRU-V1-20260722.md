# MOB APPLIED — Login rate limiter LRU V1

**Date:** 2026-07-22  
**MOB:** `mob-sec-login-rate-lru`

## Applied

- Replaced the unbounded login-attempt `Map` with a bounded LRU limiter.
- Preserved the existing policy: ten attempts in fifteen minutes, followed by
  a fifteen-minute block.
- Limited the process to 5,000 client keys and evicted least-recently-used
  records when full.
- Bounded each client key to 128 characters.
- Retained five-minute cleanup of expired inactive records.
- Applied the same limiter to dashboard login, TOTP login, and technical login.
- Kept reverse-proxy trust disabled by default; enabling it remains an explicit
  administrator setting for nginx/Caddy deployments.

## Verification

- Normal ten-attempt allowance and eleventh-attempt 429: PASS.
- Retry-After header and block expiry: PASS.
- LRU ordering and eviction: PASS.
- Synthetic 20,000-unique-IP flood remains capped at 5,000 records: PASS.
- Oversized client key bound and direct-address fallback: PASS.
- Full install, PostgreSQL retirement/legal, startup, rollback, fatal-process
  and SIP-crypto gates: PASS.
- Production npm audit: zero vulnerabilities.

## Legal notice impact

None. The limiter uses the built-in JavaScript `Map` and adds no dependency.

## Runtime

The new limiter activates on the next service restart. Live login and SIP smoke
are intentionally deferred until the operator resumes after rest.

