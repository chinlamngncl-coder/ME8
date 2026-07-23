# MOB DISC — Diagnose WebSocket “crash” (NO APPLY)

**Status:** DISC only — 2026-07-19 ~15:45 +08 · **no code · no APPLY**  
**Subject:** `MOB-DISC-DIAGNOSE-WEBSOCKET-CRASH`  
**Asked:** Exact fatal exception that killed the backend; why `ws://localhost:3990` / `3989`; IOController buffer drop; Google’s 3 crash theories.

---

## Executive answer

### Did the Node backend crash this afternoon?

**No evidence of a fatal process kill at the time of the console WS errors.**

| Check | Result (lab, now) |
|-------|-------------------|
| Service `UbitronC2` | **SERVICE_RUNNING** (NSSM) |
| Listen | `0.0.0.0:3988` HTTP, `:3989` video WS, `:3990` audio WS — all **LISTENING** (PID **41712**) |
| Live log | `storage/service-stdout.log` still writing SIP sweeps through **15:44** |
| Last `dashboard listening` | **2026-07-19 02:41:46** — then continuous work; **no new listen line this afternoon** |
| `uncaughtException` / `unhandledRejection` in stdout (search) | **No hits** tied to a death event |
| Windows NSSM Application log | Last cycle = **STOP then START** at **02:41:41–02:41:45** with **exit code 0** (controlled stop), **not** a crash dump |

**Exact fatal exception that killed the backend:**  
**None found.** Cannot invent one. The process that serves `:3988/:3989/:3990` is **up** and logging.

If the browser said WebSocket to `localhost:3990` / `3989` **failed**, that was a **client connect failure** (or a brief local refuse), **not** proof that Node exited with a fatal stack at that moment.

---

## 1) Core “crash” — what actually happened

### Service model

- NSSM service **UbitronC2** → `node.exe server.js` in ME8 folder.  
- Stdout: `storage/service-stdout.log` (~10 MB).  
- Stderr: `storage/service-stderr.log` (DPAPI noise + missing `.js.map` ENOENT — **not** a process killer).

### Process policy (why Google’s “one bad camera kills Node” is softened here)

`server.js` registers:

- `uncaughtException` → log **“process kept alive”** (EPIPE write ignored).  
- `unhandledRejection` → log **“process kept alive”**.

So even a glass-jaw exception is **designed not to exit** (unless something else kills the process: NSSM stop, OOM killer, manual kill).

### Overnight “instability” vs afternoon death

Stdout shows **many** `dashboard listening` lines **00:29–02:41** today — matching NSSM **STOP/START** pairs (exit **0**). That is **operator/service restart churn**, not an afternoon OOM autopsy.

**Afternoon (ops complaint window):** no listen restart; continuous SIP activity → backend **alive**.

---

## 2) Why `ws://localhost:3990/` and `:3989` (not `192.168.1.38`)

### Not a wrong `.env` for the browser WS URL

`.env` has:

```text
HOST=192.168.1.38
FM_HTTP_PORT=3988
FM_VIDEO_WS_PORT=3989
```

Audio WS = HTTP+2 → **3990**. Backend binds **`0.0.0.0`** (all interfaces), so LAN and localhost both reach the same servers.

### Client builds WS from the **page URL hostname**

`public/js/video-wall.js`:

```text
video WS  = ws://{window.location.hostname}:{HTTP_port+1}/
audio WS  = ws://{window.location.hostname}:{HTTP_port+2}
```

So:

| You open dashboard as | Video WS | Audio WS |
|----------------------|----------|----------|
| `http://localhost:3988` | `ws://localhost:3989` | `ws://localhost:3990` |
| `http://192.168.1.38:3988` | `ws://192.168.1.38:3989` | `ws://192.168.1.38:3990` |

**`localhost` in the console means the Ops tab was loaded via localhost** — expected. It is **not** proof the server bound only to 127.0.0.1 (netstat shows `0.0.0.0`).

### When localhost WS “fails” while HTTP still works

Possible without Node death:

- Tab / extension / transient TCP glitch on 3989/3990  
- Stale page after a **night** restart while sockets half-dead (`CLOSE_WAIT` / `TIME_WAIT` seen on 3988)  
- JSMpeg/audio path retrying while primary path is ZLM HTTP-FLV (different port **18088**) — console still shows 3989/3990 attempts from classic players

---

## 3) `[IOController] > 262 bytes unconsumed… dropped`

**Client-side mpegts.js** demux flush warning (browser), **not** a Node server buffer OOM log line.

Meaning: FLV/mse player discarded leftover bytes on flush/seek/teardown. Common when stream stops, reconnects, or ZLM/mpegts tears down. **Do not treat as the fatal backend exception.**

---

## 4) Google’s three theories — mapped to this lab evidence

| Theory | Fits this afternoon? | Notes |
|--------|----------------------|--------|
| **1. Unhandled exception glass jaw** | **Not proven** | Handlers keep process alive; no fatal stack in service log for a death event |
| **2. Memory leak / OOM** | **Not proven** | No WER/OOM event found in the sample; process still listening; no “out of memory” in log search |
| **3. Dangling sockets / port exhaustion** | **Not proven as “cannot accept any new”** | `:3988/:3989/:3990` still LISTENING; some TIME_WAIT/CLOSE_WAIT on clients — messy sessions, not port-table death |

**Separately (product, not this WS autopsy):** Call/PTT “dead” with ZLM picture still fits **`MOB-DISC-CALL-PTT-SOS-DEAD-AFTER-ZLM`** (server `isStreamingForCam` false). That can make the **dashboard feel totally dead** even while Node is healthy.

---

## 5) Stderr noise (not the kill)

- DPAPI `Unprotect` / path errors (secrets helper under LocalMachine scope) — noisy, recurring.  
- `ENOENT` for `mpegts.js.map` / leaflet maps — browser source-map requests.  
- Historical: `Cannot find module 'C:\Users\user\Desktop\Enterprise'` — **space in path** breakage from a bad launch command (old); not today’s listen line.

---

## 6) What we can say honestly to the operator

1. **No exact fatal exception** was found that killed UbitronC2 during the WS failure complaint window.  
2. Backend **is running**; WS ports **are bound**.  
3. Console `localhost:3990/3989` = **you opened Ops as localhost**; mirrors hostname by design.  
4. IOController drop = **browser mpegts**, not server OOM proof.  
5. “Everything dead” may still be **true in the UI** (Call/PTT/ZLM contract + half-dead browser sockets) **without** Node having crashed.

---

## 7) If we need a harder proof next time (still no APPLY now)

Operator paste **exact console timestamp** of the WS error; agent greps stdout ±2 minutes for `uncaughtException` / listen / NSSM stop.  
Or: open Ops as `http://192.168.1.38:3988` and compare whether WS errors still say localhost (they should not).

---

## Status

**DISC only — no code.**  

**Fatal exception:** **none identified.** Backend **alive** at diagnosis. WS hostname = **browser location**, not `.env HOST` for client players.
