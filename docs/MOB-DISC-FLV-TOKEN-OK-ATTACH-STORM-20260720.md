# MOB-DISC — Token auth OK; still no live (attach storm)

**Date:** 2026-07-20 ~15:32  
**Status:** DISC only — **no code**  
**After:** `MOB-APPLY-FLV-STREAM-TOKEN-AUTH-V1`  
**Operator:** Still fail. No picture.

---

## Verdict

| Layer | Status |
|-------|--------|
| WVP handoff / startPlay | **PASS** |
| Token auth / same-origin proxy | **PASS** — `flv-stream proxy open` (no 401 in log) |
| ZLM upstream pipe | **PASS** (HTTP 200 opens to `:18088`) |
| mpegts prove / UI paint | **FAIL** |
| Live picture | **FAIL** |

**401 Unauthorized is fixed.** Failure moved downstream.

---

## Log proof (~15:32)

```
handoff start  …008/…009  flvProxy:/api/lab/wvp/flv-stream?camId=…&labWvp=…  path:flv-stream-token-auth-v1
flv-stream proxy open  (×56 in ~15s for one operator try)
flv-stream proxy error  socket hang up  (occasional — client disconnect)
handoff soft-stop / hard-stop  (operator close)
```

- **No** `Unauthorized` / `startPlay fail`.
- **Many** parallel proxy opens on **same cam** — attach storm, not auth.

---

## What token fix did

| Before | After |
|--------|-------|
| mpegts GET → JSON `{ ok:false, error:"Unauthorized" }` | Proxy opens; FLV bytes flow from ZLM |

DevTools should now show **`video/x-flv`** (or binary stream) on `flv-stream?camId=…&labWvp=…`, not JSON 401 — unless stale JS (hard refresh required once after restart).

---

## Why still black (disc — new root cause)

### Attach storm kills mpegts before prove

Phase 4 + token auth path:

1. `video-stream-ready` → `attachWvpHandoffFlvForCam`
2. **Retries** at +450ms and +1100ms (same function)
3. Open All / dual cam → **each cam × each slot**
4. Every attach call → `destroyPlayer` → new mpegts → **300ms prove window**
5. Next attach **destroys** player before prove → `[me8-flv] attach ok` never sticks

Log **56 proxy opens** in one short session = browser opening many FLV connections; server side OK, **client player churn**.

### Secondary

- `socket hang up` when mpegts aborts mid-stream
- Possible console `[me8-flv] attach fail` (`zlm_not_stable` / `zlm_player_error`) — operator did not paste; consistent with churn

**Not:** SOS, `:5060`, WVP startPlay, cookie auth, or cross-port CORS (those layers pass).

---

## Phase map (live pipe)

```
startPlay + token URL     ✅
flv-stream proxy open     ✅
single stable mpegts/slot ❌  ← current blocker
wall picture              ❌
```

---

## Forward (when you APPLY — pick one)

| Name | Intent |
|------|--------|
| **`MOB-APPLY-FLV-SINGLE-ATTACH-DEDUPE-V1`** | One mpegts player per wall slot; skip reattach if same `flvUrl` + in-flight/proven; drop ready-handler triple retry |
| **`MOB-APPLY-FLV-ATTACH-INFLIGHT-GUARD-V1`** | Debounce `attachWvpHandoffFlvForCam` per cam (e.g. 2s); no destroy if prove pending |
| **`MOB-APPLY-FLV-WS-FLV-FALLBACK-V1`** | If mpegts fails after one stable attach, try ws-flv path (later; only after dedupe) |

PTT / SOS re-test **not** requested.

---

## Operator (optional one glance — no matrix)

If DevTools console still shows **`Unauthorized`** → stale cache; hard refresh once.  
If Network shows **`video/x-flv`** + many parallel `flv-stream` requests → **attach storm** disc confirmed.  
If one request + `[me8-flv] attach fail` with stable URL → paste reason for next MOB.

---

## One line

Token auth **PASS** (proxy opens); live still dark because **UI attach storm** tears down mpegts before prove — need **single-attach dedupe**, not more backend/auth work.
