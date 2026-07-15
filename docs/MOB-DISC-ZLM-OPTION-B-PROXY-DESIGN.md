# MOB DISC — Option B: Fix ZLM internal FLV proxy (design review)

**Status:** **DISC ONLY** — no code, no restart, no MOB-APPLY until you approve each step  
**Search:** `Option B`, `proxy design`, `flv proxy`, `Gate B`

**Parent:** `docs/MOB-DISC-ZLM-PROXY-FAIL.md`

---

## Plain answer

Gate B **passed** at 12:44 with **direct lab FLV** (`127.0.0.1:8080`). The **proxy MOB** broke play. Relay + ZLM are still fine; **browser → dashboard → ZLM** path was never proven.

Option B = **design a correct proxy** in **small steps**, each with **agent proof in logs** before you test, **one MOB-APPLY at a time**.

---

## What we know for certain (logs)

| Fact | Meaning |
|------|---------|
| `zlm health ok` | ZLM API + secret OK |
| `zlm relay first frame` | WS → FFmpeg → RTMP publish OK |
| **Zero** `zlm flv proxy open` / `denied` all day | Browser request **never reached** our proxy handler (or Fleet ran old bundle — must verify on next MOB) |
| Gate B PASS used **absolute** `http://127.0.0.1:8080/...` | Player + ZLM path **worked** |
| FAIL uses **relative** `/api/lab/zlm/flv/...?labFlv=...` | Something between **mpegts.js** and **Express** is broken — not relay |

**Not the cause:** pool hooks, wall code, mpeg1 transcode (that was fixed and PASS’d).

---

## Three hypotheses (must prove, not guess)

### H1 — mpegts.js + Web Worker + relative URL

`test-zlm.html` uses `enableWorker: true`. The worker may:

- Resolve `/api/...` incorrectly, or  
- Drop `?labFlv=` query string, or  
- Fail fetch before it hits Fleet  

**Why it fits:** instant player error, **no server log at all**.

**Proof test (agent, before you touch Play):**  
`Invoke-WebRequest` to `http://127.0.0.1:3988/api/lab/zlm/flv/{id}.live.flv?labFlv={token}` with valid token → must see `zlm flv proxy open` in log.

### H2 — Play before ZLM registers FLV

Relay “first frame” ≠ ZLM HTTP-FLV ready. Player may hit proxy while upstream returns **404**.

**Why it might fit:** would log `zlm flv proxy upstream status 404` — we did **not** see that either, so H2 alone is unlikely unless request never arrived (H1).

**Still required in design:** `/api/lab/playback` waits for `getMediaList` match before returning `engine: zlm`.

### H3 — Auth

Session cookie not sent on FLV fetch; `labFlv` token was added without MOB-APPLY.

**Why it’s weaker:** token fix should log `denied` if request arrived — we saw **nothing**.

**Design:** keep token **or** use **absolute same-origin URL** + `withCredentials`; agent proves with curl first.

---

## Option B target (lab + future ship)

```
Browser (test-zlm.html)
    → GET https://{dashboard}/api/lab/zlm/flv/{stream}.live.flv?labFlv=…
        → Fleet proxy (auth: session OR token)
            → GET http://127.0.0.1:8080/live/{stream}.live.flv  (localhost only)
```

| Layer | Lab today | Ship later |
|-------|-----------|------------|
| Browser | Same host `:3988` only | HTTPS on customer domain |
| ZLM HTTP | `127.0.0.1:8080` Docker | ZLM child process, loopback |
| RTMP ingest | `127.0.0.1:19350` | loopback |
| **WAN :8080** | **Never** | **Never** |

---

## Forbidden (locked)

- `liveStreamPool.js` — any edit  
- `video-wall.js` / Command Wall player  
- `server.js` start-video / stop-video  
- Pool RTP hooks  
- Stacking proxy + token + restart in one MOB  
- Agent MOB-APPLY without your exact MOB name  

**Allowed:** `lib/zlmFlvProxy.js`, `lib/zlmIngestLab.js`, `lib/livePlaybackBroker.js`, lab routes in `server.js`, `public/test-zlm.html` only.

---

## Option B — split into 4 MOBs (you approve each)

### B1 — `mob-me8-zlm-proxy-b1-server-proof` (agent only)

**Goal:** Prove proxy **pipe** works without browser.

| Step | Who |
|------|-----|
| Open All + relay running on one cam | You (or agent starts relay via API) |
| Agent curls proxy URL with valid `labFlv` token | Agent |
| Log must show `zlm flv proxy open` | Agent reports |
| You test | **No** — not until B2 |

**PASS:** curl returns FLV bytes; log line present.  
**FAIL:** fix upstream only; still no browser.

---

### B2 — `mob-me8-zlm-proxy-b2-browser-url` (one file focus: test page)

**Goal:** Fix **client** URL handling.

| Change | Why |
|--------|-----|
| `flvUrl` = **absolute** `http://{Host from page}/api/lab/zlm/flv/...` | Avoid worker relative-URL bugs |
| `enableWorker: false` on mpegts for lab | Worker isolated from cookies/paths |
| `withCredentials: true` | Session backup |

**You test:** Play on `test-zlm.html` only. Wall untouched.

**PASS:** Video + log `zlm flv proxy open` when you Play.  
**FAIL:** stop; MOB DISC update; no B3.

---

### B3 — `mob-me8-zlm-proxy-b3-stream-ready` (broker + lab API)

**Goal:** Don’t hand player a URL until ZLM lists the stream.

| Change | Why |
|--------|-----|
| After relay start, poll `isStreamPublished(streamId)` ≤5s | Avoid 404 race |
| `/api/lab/playback` returns `engine: ffmpeg` + reason if ZLM not ready | Fallback path |

**You test:** Play; optional Stop/Play cycle.

**PASS:** Reliable play within 5s of relay first frame.

---

### B4 — `mob-me8-zlm-proxy-b4-fallback-ux` (optional)

**Goal:** If ZLM path fails, test page auto-tries **FFmpeg WS** (broker already supports).

| Change | Why |
|--------|-----|
| On mpegts ERROR → fetch playback again, `engine: ffmpeg` | Lab bench keeps working |

**Not required for Gate B PASS** — nice for demo.

---

## Proof checklist (Gate B proxy PASS)

You only say **PROXY PASS** when **all** true:

1. `test-zlm.html` — green **zlm** badge, **video** ≥10s  
2. Page log: `ZLM FLV play ok: http://192.168.1.38:3988/api/lab/zlm/flv/...` (absolute, **not** `:8080`)  
3. `fleet.log`: `zlm flv proxy open` **during your Play**  
4. Command Wall — **Open All** still works FFmpeg (spot check)  
5. No new `zlm relay ffmpeg exit`  

---

## Workflow (non-negotiable)

```
MOB DISC (this doc) → you reply "Approved B1" → MOB-APPLY mob-me8-zlm-proxy-b1-server-proof
→ agent reports B1 PASS/FAIL → you reply → B2 → …
```

| Rule | |
|------|--|
| You say **MOB-APPLY** + exact MOB id | Agent codes **one** MOB |
| You say **MOB DISC** | Agent **only** writes/docs/investigates |
| Agent **never** restarts Fleet unless MOB says so or you ask |
| After each MOB | You test → **PASS** or **FAIL** → next MOB |

---

## vs Option A (revert)

| | Option A (revert) | Option B (fix proxy) |
|--|-------------------|----------------------|
| Time | ~5 min to Gate B PASS | 4 MOBs, more testing |
| Ship learning | None — still `:8080` in lab | Correct same-origin pattern |
| Risk | Low | Medium if rushed — **mitigated by B1–B3 split** |

**Recommendation:** If you need **demo today** → Option A first, Option B later.  
If you want **ship-shaped lab** → Option B starting **B1** (agent proof, you don’t test yet).

---

## Current uncommitted tree (do not push)

Local changes since Gate B git push:

- `lib/zlmFlvProxy.js` (new)  
- `lib/zlmIngestLab.js` (proxy + token)  
- `server.js` (lab FLV route)  
- `public/test-zlm.html` (proxy copy + withCredentials)  

**B1 may include:** verify Fleet actually loaded these routes (`flvProxy` in boot log).  
**Do not** treat token patch as approved — fold into B2/B3 design or revert with A.

---

## What you reply next

| Reply | Agent does |
|-------|------------|
| **`Approved B1`** then **`MOB-APPLY mob-me8-zlm-proxy-b1-server-proof`** | Server curl proof only; **no browser MOB** |
| **`MOB-APPLY mob-revert-zlm-proxy`** | Restore 12:44 PASS path; park Option B |
| **`pause zlm`** | No work |

---

## Related

- `docs/MOB-DISC-ZLM-GATE-B-PASS.md` — last browser PASS  
- `docs/MOB-DISC-ZLM-PORTS-INTERNAL-PROXY.md` — first proxy attempt  
- `docs/MOB-DISC-ZLM-ARCHITECTURE-PROPOSAL.md` — gates C/D still parked  

---

## PARKED — ZLM latency below ~8–10s (2026-07-06) → **RESUMED**

**Was:** deferred (“go to that later”)  
**Now (2026-07-14):** user said `MOB DISC zlm latency` — **near handover, must solve**.  
**Active disc:** `docs/MOB-DISC-ZLM-LATENCY-HANDOVER.md`

**Bench then:** ZLM proxy ~**8–10s** vs wall ~**2s**. Relay-latency MOB PASS. Player chase MOB **reverted** (minutes lag).

**Still do not retry:** mpegts `liveBufferLatencyChasing` / stash-off.

**Direction:** measure → cut hops / better play URL → skip double convert — not buffer knobs. See handover disc.
