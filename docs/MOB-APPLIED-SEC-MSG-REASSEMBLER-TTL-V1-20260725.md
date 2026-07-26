# MOB-APPLIED — SEC Phase 1.4 Message reassembler TTL

**Date:** 2026-07-25  
**Task:** Phase 1 **1.4** — `SEC-MSG-REASSEMBLER-TTL-V1`  
**Operator:** **PASS** (2026-07-25) — restart + BWC video OK  
**Roadmap:** `MOB-DISC-ARCHITECT-MASTER-ROADMAP-20260725.md`  
**Disc:** `MOB-DISC-SEC-GOOGLE-FIVE-TIMING-SPAWN-DISK-WS-20260724.md` (Task 4)  
**Smoke:** `MOB-DISC-SEC-LAB-SMOKE-PLAIN-ENGLISH-20260725.md`

## Change

### `lib/hdaMessageProtocol.js` — `MessageReassembler`

- Each partial state tracks **`lastTouched`** (updated on every `ingest` chunk).
- **`pruneStaleBuffers(maxAgeMs = 60000)`** deletes assemblies with no chunk for ≥ TTL; returns prune count.
- `clear()` on socket close unchanged.

### Wiring (`server.js` / `run.js` msgWss)

```text
every 15s → for each activeCameraSockets ws → pruneStaleBuffers(60000)
timer.unref() so it does not keep the process alive alone
```

**Verify:** `npm run verify:sec-msg-reassembler-ttl`

## Operator smoke (plain English)

**Disc:** `MOB-DISC-SEC-LAB-SMOKE-PLAIN-ENGLISH-20260725.md`

1. Restart lab the usual way  
2. Open dashboard  
3. Open a BWC — **if video still works like before → PASS**

You do **not** need to test “messaging.” Say **PASS** or **FAIL**.

## Next (after PASS only)

**Task 1.5** — `SEC-MSGWSS-HMAC-AUTH-V1` (breaking / device URL — review carefully)
