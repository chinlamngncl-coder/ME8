# MOB-DISC — FLV proxy 401 Unauthorized; still no live

**Date:** 2026-07-20 ~15:24  
**Status:** DISC only — **no code**  
**After:** `MOB-APPLY-VIDEO-UI-RACE-AND-PROXY-FIX`  
**Operator:** DevTools shows `{ ok: false, error: "Unauthorized" }`. Still no picture.

---

## Verdict

| Layer | Status |
|-------|--------|
| WVP handoff backend | **PASS** — `handoff start` · `flvProxy:/api/lab/wvp/flv-stream?camId=…` |
| Same-origin proxy route | **PARTIAL** — route exists; **some** requests open upstream |
| Browser FLV fetch | **FAIL** — DevTools **`Unauthorized`** (401 JSON, not FLV bytes) |
| Live picture | **FAIL** |

**Root cause (disc):** `/api/lab/wvp/flv-stream` was wired with **`requireDashboardAuth` (session cookie only)**. mpegts FLV fetch does not reliably carry `fm_session` the way normal `fetch('/api/…', { credentials: 'same-origin' })` does. Server returns JSON `{"ok":false,"error":"Unauthorized"}` — player cannot decode → black tile.

This is **not** a WVP / `:5060` / handoff regression. It is **wrong auth gate on the FLV pipe**.

---

## DevTools proof (operator)

```json
{ "ok": false, "error": "Unauthorized" }
```

Exact shape from `lib/dashboardAuth.js` `requireDashboardAuth` when no session on `/api/*`.

---

## Log proof (~15:24:44)

```
wvp video handoff start  camId:…009  flvProxy:/api/lab/wvp/flv-stream?camId=…009  flvHost:192.168.1.38:18088
wvp flv-stream proxy open  (many times in ~2s)
wvp flv-stream proxy error  socket hang up  (intermittent)
```

**Read:**

- Backend play + proxy **can** work when a request passes auth.
- Storm of parallel opens (Open All / retries) + **401 on other fetches** + hang-ups = mpegts never stable → **no picture**.
- Operator’s visible **Unauthorized** = failed FLV segment(s), not SOS.

---

## Why session-cookie auth was wrong here

ME8 already has **two working FLV proxy auth patterns** that do **not** rely on cookie-only for mpegts:

| Route | Auth |
|-------|------|
| `/api/lab/wvp/flv?labWvp=TOKEN` | Short-lived **token in URL** (no dashboard session on GET) |
| `/api/lab/zlm/flv/:file` | Session **or** `labFlv` query token (`zlmFlvProxy.requireLabFlvAccess`) |

**Proxy fix used:** `requireDashboardAuth` only — **new mistake**, not reused lab pattern.

mpegts `withCredentials: true` is not enough when the player’s internal HTTP loader treats the stream as a bare URL GET; some requests in the attach storm miss `fm_session` → 401 JSON body → `[me8-flv] attach fail`.

---

## Phase history (live only)

| APPLY | Result |
|-------|--------|
| ACL translator | SOS **PASS** |
| Backend handoff | `startPlay` **PASS** |
| FLV-on-ready UI | Dark — ignored `flvUrl` path fixed later |
| Proxy + race fix | Same-origin URL good idea; **auth gate wrong** → **401** |

---

## Forward (when you APPLY — one fix)

**`MOB-APPLY-FLV-STREAM-TOKEN-AUTH-V1`** (recommended)

1. On handoff `ensurePlay`, issue short-lived token (reuse `wvpLabClient.issueFlvToken` or handoff-local map).
2. Emit URL: `/api/lab/wvp/flv-stream?camId=…&labWvp=TOKEN` (or `handoffFlv=TOKEN`).
3. Route auth: **token valid for cam** OR session (mirror `requireLabFlvAccess`) — **remove cookie-only gate**.
4. Keep same-origin proxy pipe to `:18088`.

No PTT. No SOS re-test unless you ask.

---

## One line

Proxy path is right; **401 Unauthorized** because FLV GET requires dashboard cookie — mpegts gets JSON instead of video. Next fix = **token-in-URL auth** like existing `/api/lab/wvp/flv`, not another handoff rewrite.
