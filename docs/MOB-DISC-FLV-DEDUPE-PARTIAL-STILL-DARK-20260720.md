# MOB-DISC — Dedupe partial; still no live

**Date:** 2026-07-20 ~15:46  
**Status:** DISC only — **no code**  
**After:** `MOB-APPLY-FLV-SINGLE-ATTACH-DEDUPE-V1`  
**Operator:** Still fail.

---

## Verdict

| Layer | Status |
|-------|--------|
| Token + proxy | **PASS** — `flv-stream proxy open`, no 401 |
| Attach storm | **PARTIAL** — ~16 proxy opens (was ~56); not one-per-cam yet |
| mpegts prove / paint | **FAIL** |
| Live picture | **FAIL** |

Dedupe helped. **Not enough** for picture PASS.

---

## Log proof (~15:45–15:46)

```
handoff start  …008 / …009  flvProxy …&labWvp=…
flv-stream proxy open  (×16 in session — pairs per cam)
handoff start  …008 again @ 15:46:23  (re-open same cam)
soft-stop / hard-stop  (operator stop ~12–16s later)
```

- **No** `Unauthorized`, **no** `startPlay fail`, **no** `proxy upstream` non-200 in this window.
- FLV pipe **connects**; wall still dark.

---

## What dedupe fixed

| Before | After (~15:46) |
|--------|----------------|
| ~56 `flv-stream proxy open` / short try | ~16 |
| +450 / +1100ms UI retries | **Removed** |
| Per-slot inflight lock | **In** |

Storm **reduced**, not eliminated.

---

## Why still black (disc — ranked)

### 1 — New `labWvp` token breaks URL dedupe

Dedupe lock is **per slot + camId + exact `flvUrl`**.

Each backend `handoff start` issues a **new token** → new URL.  
Duplicate `start-video` / re-open same cam → **new URL** → lock allows **reattach** → destroys mpegts mid-prove.

Log: `handoff start` for …008 at **15:45:58** and again **15:46:23** on same operator try.

### 2 — mpegts still not proving (likely)

Server shows proxy **open** (HTTP 200). Failure is probably **client decode/prove**:

- `[me8-flv] attach fail` (`zlm_player_error`, `zlm_not_stable`, `zlm_prove_timeout`)
- Or prove never reached before re-handoff

Agent cannot see browser console — operator did not paste lines this round.

### 3 — Dual-cam / Open All pairs

mpegts often opens **2** HTTP connections per player → log shows **pairs** of `proxy open` per cam. Expected; not necessarily failure if prove OK.

### 4 — Stale JS (one-time check)

Cache bust: `?v=20260720-flv-single-attach-v1`. Without hard refresh, old retry script may still run.

---

## Pipe status (honest)

```
ACL / SOS          ✅ (prior; not re-tested)
handoff startPlay  ✅
token proxy        ✅
attach dedupe      ⚠️ partial
mpegts prove       ❌ (disc)
wall picture       ❌
```

---

## Forward (when you APPLY — pick one)

| Name | Intent |
|------|--------|
| **`MOB-APPLY-FLV-STABLE-TOKEN-REUSE-V1`** | UI: if cam already inflight/live, **ignore** new `flvUrl` from second `video-stream-ready` |
| **`MOB-APPLY-START-VIDEO-HANDOFF-DEDUPE-V1`** | Backend: one `video-stream-ready` + one token per cam per watch; debounce duplicate `start-video` |
| **`MOB-APPLY-FLV-MPEGTS-PROVE-EXTEND-V1`** | UI: longer prove window + single connection option (only after stable token) |

PTT / SOS re-test **not** requested.

---

## One line

Dedupe cut the storm (~56→16) but **re-handoff issues new token URL** and **mpegts still never proves** — need stable-token reuse + prove diagnosis, not more proxy/auth work.
