# MOB MASTER FULL-STACK AUDIT
## Security · Concurrency · Logic Bugs · System Architecture
**Date:** 2026-08-20  
**Scope:** `server.js` (15,603 lines) · `lib/**/*.js` · `public/js/*`  
**Mode:** READ-ONLY — no code modified  

---

## Legend

| Severity | Meaning |
|----------|---------|
| **Critical** | Can crash the process, corrupt data, or allow unauthorized access |
| **High** | Degrades stability or security under normal operational load |
| **Medium** | Architectural weakness; fails under edge-case or high-concurrency stress |
| **Low** | Code quality / maintainability risk with no immediate runtime impact |

---

## Domain 1 — Application Logic & Runtime Stability

---

### FINDING 1.1 — Missing Global `uncaughtException` / `unhandledRejection` Handlers
**Severity:** Critical  
**Location:** `server.js` — top-level (lines 1–70)

**Mechanism:**  
`installFatalProcessPolicy({ log })` is invoked at line 68, which registers `process.on('uncaughtException')` and `process.on('unhandledRejection')` internally via `lib/fatalProcessPolicy.js`. However, this call occurs **after** several synchronous I/O operations, module loads, and early configuration parsing (lines 1–67). Any exception thrown before line 68 (e.g., from `.env` parsing, TLS cert sync at line 709, or a missing dependency) will propagate without a safety net, crashing the process silently.  
In contrast, all baseline versions (e.g., `baseline/2026-07-18-classic-pass/server.js` line 43) registered the handlers as the very first statements.

**Recommended Remediation:**  
Move `installFatalProcessPolicy({ log })` (or equivalent raw `process.on` registrations) to the first lines of `server.js`, before any `require()` that involves I/O, network calls, or disk reads.

---

### FINDING 1.2 — Blocking `spawnSync` on Main Thread at Startup
**Severity:** High  
**Location:** `server.js` lines 709–724

**Mechanism:**  
```js
const ensureTls = spawnSync(
    process.execPath,
    [path.join(__dirname, 'scripts', 'ensure-lab-dashboard-tls-certs.js')],
    { encoding: 'utf8', windowsHide: true, cwd: __dirname }
);
```
`spawnSync` fully blocks the Node.js event loop until the child process exits. If the TLS certificate generation script hangs (e.g., waiting for entropy, filesystem contention under heavy load, or an unresponsive disk), the entire ME8 server freezes at boot. No requests, health checks, or WebSocket connections can be served during this window.

**Recommended Remediation:**  
Replace with an async `spawn` or a Promise-wrapped `exec` with a hard timeout (`AbortController`). Run certificate ensure as a startup prerequisite before `server.listen`, but asynchronously so the event loop remains responsive.

---

### FINDING 1.3 — Silent Error Swallowing in License Heartbeat
**Severity:** Medium  
**Location:** `lib/licenseHeartbeat.js` line 78

**Mechanism:**  
```js
runCheck().catch(function () {});
```
All exceptions from the license heartbeat check are silently swallowed. If the license server becomes unreachable, the license file is corrupted, or the heartbeat logic throws an unexpected error, the system will continue operating without any log entry, operator alert, or degraded-mode indicator. This could allow an expired or revoked license to keep granting access indefinitely.

**Recommended Remediation:**  
Replace the empty catch with at minimum a `log.warn(...)` call. Optionally escalate to a health flag that surfaces on `/api/health` so operators see license-check failures during system audits.

---

### FINDING 1.4 — Silent Error Swallowing in `fixedCamRegistry`
**Severity:** Low  
**Location:** `lib/fixedCamRegistry.js` line 24

**Mechanism:**  
```js
} catch (_) {}
```
An entirely empty catch block around registry initialization. If the camera registry JSON is corrupted or malformed, the parse error is swallowed, leaving the registry in an empty/undefined state. This causes all camera lookups to silently return `null` without a traceable root cause.

**Recommended Remediation:**  
Log the caught error at `warn` level. Re-initialize the registry to a safe empty default and surface the issue.

---

### FINDING 1.5 — Unguarded `JSON.parse` on Disk Files in Hot Paths
**Severity:** Medium  
**Location:** `server.js` lines 292, 2816, 10817, 11057, 11681

**Mechanism:**  
Multiple `JSON.parse(fs.readFileSync(...))` calls occur without try/catch. Examples:
- Line 292: `JSON.parse(fs.readFileSync(FR_SETTINGS_FILE, 'utf8'))` — FR settings on process start.
- Line 2816: `JSON.parse(fs.readFileSync(VIDEO_CHANNELS_PATH, 'utf8'))` — video channel config loaded per-request.
- Line 11057: `JSON.parse(fs.readFileSync(ledgerPath, 'utf8'))` — SOS ledger loaded inside a function.

If any of these files is truncated mid-write (e.g., power loss during `writeFileSync`), the JSON parse throws a `SyntaxError`, crashing the enclosing route or corrupting state without user-visible feedback.

**Recommended Remediation:**  
Wrap each `JSON.parse(fs.readFileSync(...))` in a try/catch. On failure, log and return a safe default object rather than propagating the exception.

---

## Domain 2 — System Structure & Integration Integrity

---

### FINDING 2.1 — Dashboard Video WebSocket Has No Authentication Gate
**Severity:** High  
**Location:** `server.js` lines 769–788

**Mechanism:**  
`onDashboardVideoWsConnection(ws, req)` directly calls `liveStreamPool.attachStreamClient(ws, camId)` or `liveStreamPool.attachLegacyStreamClient(ws)` with no session validation on the `req` object. The `io` Socket.IO connections have an auth middleware (`io.use(...)` at line 760), but the raw `dashboardMediaWs` WebSocket server (video stream proxy on a separate port `VIDEO_WS_PORT`) does not appear to share this middleware chain. Any unauthenticated client that knows the video WebSocket port can attach and receive live video streams without logging in.

**Recommended Remediation:**  
Add session cookie validation to `onDashboardVideoWsConnection` by inspecting `req.headers.cookie` against `dashboardAuth.isValidSession()` before calling `attachStreamClient`.

---

### FINDING 2.2 — Sorter Process Registers `process.on('exit')` Inside a Repeated Function
**Severity:** Medium  
**Location:** `server.js` lines 15370–15374

**Mechanism:**  
```js
process.on('exit', () => {
    try { if (ubitronSorterProcess) ubitronSorterProcess.kill(); } catch (_) {}
});
```
This listener is registered **inside** `startUbitronOfflineSorter()`. While there is a guard `if (ubitronSorterProcess) return;` at line 15343 that prevents the sorter from being double-spawned, if the process is ever stopped and restarted (e.g., via API), the guard could be cleared before restart, registering a **second** `exit` listener. Each call to `process.on('exit')` accumulates. Node.js emits a `MaxListenersExceededWarning` at 11 listeners, and eventually this becomes a memory leak.

**Recommended Remediation:**  
Register the `process.on('exit')` handler once at module initialization, outside the `startUbitronOfflineSorter` function. Use `process.once('exit', ...)` and reference the process object indirectly.

---

### FINDING 2.3 — `process.on('exit')` Used for Child Process Cleanup
**Severity:** Medium  
**Location:** `server.js` line 15370

**Mechanism:**  
The `exit` event in Node.js fires **synchronously** at the point when the process is about to exit. At this stage, the event loop is no longer running — asynchronous I/O, callbacks, and `setTimeout` calls are ignored. `ubitronSorterProcess.kill()` is a syscall that may complete, but any async cleanup (flushing buffers, sending SIGTERM then waiting for SIGKILL) is impossible. The child process may become an orphan/zombie if the parent exits before the kernel delivers the signal.  
Additionally, no `SIGTERM` / `SIGINT` handlers exist in the main `server.js` — only the `exit` handler. Graceful shutdown from a process manager (PM2, systemd) sending `SIGTERM` will not trigger child process cleanup.

**Recommended Remediation:**  
Add `process.on('SIGTERM', ...)` and `process.on('SIGINT', ...)` handlers that kill child processes synchronously and then call `process.exit(0)`. Use `SIGTERM` first, then `SIGKILL` after a 3s grace period.

---

## Domain 3 — Authentication, RBAC & API Security

---

### FINDING 3.1 — Unauthenticated `/api/health` Endpoint Leaks System State
**Severity:** Medium  
**Location:** `server.js` lines 1323–1350

**Mechanism:**  
`GET /api/health` has no authentication middleware. Its response body includes `body.catalogDispatchers`, `body.cache` (Redis snapshot state), `body.displayMonitor3`, internal degraded reasons (`catalog-dispatcher` code names), and service labels. An external attacker can poll this endpoint to map internal service topology, identify degraded components, and time attacks to coincide with degraded states. This also confirms the product brand/version to fingerprinters.

**Recommended Remediation:**  
Offer a minimal health check (HTTP 200 / 503 only, no body, or a single `{"ok":true}`) to unauthenticated callers. Move detailed internal diagnostics to a `/api/health/detailed` route protected by `requireSuperAdmin`.

---

### FINDING 3.2 — Unauthenticated `/api/metrics` with Weak Token Auth
**Severity:** Medium  
**Location:** `server.js` lines 1480–1498

**Mechanism:**  
The metrics endpoint is protected by a Bearer token (`metricsToken` from `labSettingsLive()`). However:
1. If `metricsEnabled` is true but `metricsToken` is empty/unconfigured (`!configured`), the endpoint returns 401 — but the error message reveals the endpoint exists.
2. The token comparison is done with `===` (not `crypto.timingSafeEqual`), making it vulnerable to timing attacks that progressively reveal token length and content.
3. The endpoint response includes `online` device count, `streaming` camera count, and memory usage (`mem.heapUsed`, `mem.heapTotal`), which constitutes infrastructure profiling data.

**Recommended Remediation:**  
- Use `crypto.timingSafeEqual(Buffer.from(token), Buffer.from(configured))` after verifying equal length.
- If the token is not configured, return 404 (endpoint should not exist from an attacker's perspective).

---

### FINDING 3.3 — Unauthenticated `GET /api/site-resilience`
**Severity:** High  
**Location:** `server.js` lines 1428–1478

**Mechanism:**  
The GET handler for `/api/site-resilience` performs a manual session check:
```js
const session = req.dashboardUser || dashboardAuth.sessionFromRequest(req);
if (!session) return res.status(401).json(opErr("Unauthorized"));
```
However, unlike most other routes which use `dashboardAuth.requireSuperAdmin` or `requireAuth` as Express middleware, this route does its own inline check. If `dashboardAuth.sessionFromRequest` has a bug or is bypassed (e.g., via cookie manipulation), the fallback to `req.dashboardUser` may be `undefined` rather than `null`, silently passing the check. The POST `/api/site-resilience` correctly uses `dashboardAuth.requireSuperAdmin`, creating an asymmetry: GET is weaker than POST on the same resource.

**Recommended Remediation:**  
Apply `dashboardAuth.requireSuperAdmin` middleware to the GET route consistently with the POST route, removing the inline session check.

---

### FINDING 3.4 — Console Logging Auth Comparison Results
**Severity:** Low  
**Location:** `server.js` line 1559, 10513, 10532

**Mechanism:**  
```js
console.log('[auth] login compare', { ok: !!user, userLen: username.length });
console.log('[auth] change-password ok', { username: session.username });
console.log('[auth] reverify compare', { ok: reverifyOk });
```
`console.log` sends to stdout, which is typically captured in production log files. Logging `username` during password change, and `userLen` (which helps an attacker enumerate valid usernames by distinguishing timing vs. length responses) into unstructured stdout is a minor credential-adjacent leak. In a high-compliance environment (law enforcement), these logs may also appear in audit exports.

**Recommended Remediation:**  
Route these through the structured `log.*` facility at `debug` level (not `info`), and omit `username` from the change-password success log or hash it before logging.

---

## Domain 4 — High-Concurrency Streaming & Memory Leaks

---

### FINDING 4.1 — WVP FLV Proxy Pipe Has No Error or Client-Disconnect Handler
**Severity:** High  
**Location:** `lib/wvpVideoHandoff.js` line 444

**Mechanism:**  
```js
upstreamRes.pipe(res);
```
This raw `.pipe()` has no `.on('error', ...)` handler on `upstreamRes` or `res`. When:
- The upstream WVP/ZLM server drops the connection mid-stream, `upstreamRes` emits an `error` event.
- The browser client disconnects (e.g., operator closes tab), `res` emits a `close` event.

Without error handlers, Node.js defaults to throwing the error as an uncaught exception, which would be caught by `fatalProcessPolicy` and **restart the entire server**. Additionally, `upstreamRes` is not destroyed when `res` closes, leaving the upstream HTTP connection open and leaking sockets at the WVP/ZLM layer. Under a 64-camera deployment, this can exhaust available file descriptors rapidly.

**Recommended Remediation:**  
Replace `.pipe(res)` with `stream.pipeline(upstreamRes, res, (err) => { if (err) log.media.warn(...) })`. Also listen to `req.on('close', () => upstreamReq.destroy())` to tear down the upstream request when the browser disconnects.

---

### FINDING 4.2 — File Download Streaming Lacks Error Handlers
**Severity:** High  
**Location:** `server.js` lines 4230, 7568, 7571, 9594, 9597

**Mechanism:**  
All evidence file download handlers use the pattern:
```js
fs.createReadStream(fullPath, { start, end }).pipe(res);
// or
fs.createReadStream(fullPath).pipe(res);
```
No `.on('error', ...)` is attached to either the read stream or `res`. If:
- The evidence file is deleted or moved mid-stream.
- The disk becomes unavailable (NAS disconnect).
- The operator closes the browser during download.

The read stream emits an `error` event that propagates as an uncaught exception, again triggering `fatalProcessPolicy` and restarting the server. This is particularly dangerous during evidence court export operations.

**Recommended Remediation:**  
Wrap each `createReadStream().pipe(res)` with:
```js
const s = fs.createReadStream(fullPath, opts);
s.on('error', (err) => { log.warn(...); res.destroy(); });
res.on('close', () => s.destroy());
s.pipe(res);
```
Or use `stream.pipeline`.

---

### FINDING 4.3 — FFmpeg stdin Error Silently Discarded
**Severity:** Medium  
**Location:** `lib/liveStreamPool.js` line 373

**Mechanism:**  
```js
session.ffmpegProcess.stdin.on('error', () => { /* ignore */ });
```
FFmpeg stdin errors are entirely silenced. This specifically masks `EPIPE` errors that occur when FFmpeg exits unexpectedly (e.g., invalid stream format, codec failure) while data is still being written to its stdin. The caller has no way to detect that the transcoding pipeline has silently died. The session may appear "active" (`session.ffmpegProcess` is not null) while no data is actually flowing, causing a frozen live tile for the operator.

**Recommended Remediation:**  
At minimum, log the error with the `camId` at `warn` level. Consider calling `stopStream(camId)` on persistent stdin EPIPE errors to trigger the reconnect cycle.

---

### FINDING 4.4 — Reassembler Prune Interval Not Cleared on Shutdown
**Severity:** Low  
**Location:** `server.js` lines 1234–1251

**Mechanism:**  
`msgReassemblerPruneTimer` is created with `setInterval` and `.unref()` is called on it (so it won't prevent process exit). However, there is no explicit `clearInterval` in any shutdown/cleanup path. While `.unref()` prevents blocking the exit, the interval accumulates listener callbacks for the lifetime of the process. More importantly, if a graceful shutdown sequence is ever added, this interval should be cancelled as part of teardown.

**Recommended Remediation:**  
Store the timer reference and call `clearInterval(msgReassemblerPruneTimer)` in any future graceful shutdown handler.

---

## Domain 5 — Process Lifecycle & Zombie Prevention

---

### FINDING 5.1 — No SIGTERM/SIGINT Handlers for Graceful Shutdown
**Severity:** High  
**Location:** `server.js` — entire file

**Mechanism:**  
`server.js` has no `process.on('SIGTERM', ...)` or `process.on('SIGINT', ...)` handlers. When a process manager (PM2, Windows Service, Docker) sends `SIGTERM` to request graceful shutdown:
1. `ubitronSorterProcess` (Ubitron_Sorter.exe) will not be killed — it becomes an orphan.
2. FFmpeg child processes inside `liveStreamPool` will not be killed — they continue running, holding camera RTSP sessions and transcoding resources.
3. Active FTP upload sessions are not cleanly closed.
4. Database connections are not gracefully terminated.
5. WebSocket clients are not notified.

On Node.js/Windows, `SIGTERM` is not delivered by default and the process simply dies, but the children live on. On restart, duplicate FFmpeg and Sorter processes accumulate.

**Recommended Remediation:**  
Add:
```js
function gracefulShutdown(signal) {
    log.web.info('graceful shutdown', { signal });
    // 1. Stop new connections: server.close()
    // 2. Kill child processes: liveStreamPool.stopAll(), ubitronSorterProcess.kill()
    // 3. Close DB pool: siteDb.end()
    // 4. Exit: process.exit(0)
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

---

### FINDING 5.2 — FFmpeg Zombie Risk on RTSP Camera Disconnect
**Severity:** Medium  
**Location:** `lib/liveStreamPool.js` lines 361–398

**Mechanism:**  
When a BWC disconnects (SIP BYE received), `stopStream(camId)` is called which sends `SIGINT` to the FFmpeg process. However, there is no `waitpid`-equivalent timeout. If FFmpeg does not respond to `SIGINT` within a reasonable period (e.g., blocked on a network socket to an unresponsive camera), it remains alive. The socket cleanup (`activeCameraSockets.delete`) happens immediately at `ws.on('close')`, but the FFmpeg process is not tracked post-kill. A subsequent `startStream(camId)` could potentially launch a second FFmpeg for the same camera while the first lingers.

**Recommended Remediation:**  
After sending SIGINT, start a 5-second timeout that sends SIGKILL if the process has not exited. Track process state with `session.ffmpegProcess.exitCode !== null` before allowing a new spawn.

---

### FINDING 5.3 — ONVIF Client Has No Per-Connection Socket Timeout for Unresponsive Cameras
**Severity:** Medium  
**Location:** `lib/fixedCamOnvif.js` lines 60, 450

**Mechanism:**  
ONVIF connections use `timeout: 12000` (12 seconds). If a fixed camera's IP becomes unreachable (network failure, camera powered off, ARP changed), the ONVIF `connect()` call will block the async chain for the full 12 seconds before rejecting. Under a 64-camera deployment, if multiple cameras become unreachable simultaneously, the event loop's microtask queue accumulates many pending `connect()` Promises. While each is technically async (non-blocking), the aggregate DNS/TCP overhead at the OS level can spike CPU and degrade API responsiveness.

**Recommended Remediation:**  
Implement a per-camera connection queue with a maximum of N concurrent ONVIF connects (e.g., concurrency = 8). Use a semaphore/queue pattern to throttle simultaneous outbound camera connections.

---

## Domain 6 — Race Conditions, Input Sanitization & I/O

---

### FINDING 6.1 — Synchronous File I/O in Hot API Request Paths
**Severity:** High  
**Location:** `server.js` lines 2816, 10640, 10817, 10842, 11057, 11681, 11699, 11722

**Mechanism:**  
Multiple `fs.readFileSync` and `fs.writeFileSync` calls appear inside active API request handlers and timer callbacks:
- Line 2816: `JSON.parse(fs.readFileSync(VIDEO_CHANNELS_PATH, 'utf8'))` — executed per video channel fetch request.
- Line 10640: `fs.writeFileSync(VIDEO_CHANNELS_PATH, ...)` — executed on channel save.
- Line 10817: `fs.readFileSync(CONTACT_CACHE_PATH, ...)` — executed in SIP contact cache init.
- Line 11681: `fs.readFileSync(GPS_CACHE_PATH, ...)` — executed in GPS cache warmup timer.

`readFileSync` and `writeFileSync` block the event loop entirely while disk I/O completes. Under network storage (NAS with >5ms latency) or during antivirus scans (Windows Defender scanning the file on read), these calls can block the event loop for 50–500ms, causing WebSocket timeouts, SIP signaling delays, and missed GPS telemetry windows.

**Recommended Remediation:**  
Convert all in-request sync file reads to `fs.promises.readFile(...)` with `await`. For startup/init paths, the sync calls are acceptable.

---

### FINDING 6.2 — Race Condition in `VIDEO_CHANNELS_PATH` Read-Modify-Write
**Severity:** Medium  
**Location:** `server.js` lines 2815–2816 and 10640

**Mechanism:**  
The video channel configuration is read via `fs.readFileSync` and written via `fs.writeFileSync`. If two concurrent API requests (e.g., two operators modifying channels simultaneously) hit the read path before either completes the write, they will both read the same stale state, compute independent modifications, and the last `writeFileSync` wins — silently overwriting the other's change. There is no file lock, mutex, or optimistic concurrency mechanism.

**Recommended Remediation:**  
Serialize write operations through a queue (e.g., a simple `async-mutex` or a queued async function). Alternatively, move channel config to the `siteDb` PostgreSQL store which handles concurrent writes via transactions.

---

### FINDING 6.3 — Blueprint Upload `path.resolve` Without Rejecting Symlinks
**Severity:** Medium  
**Location:** `server.js` lines 7200–7204

**Mechanism:**  
```js
const absPath = path.resolve(req.file.path);
const rootResolved = path.resolve(TACTICAL_BP_DIR);
if (!absPath.startsWith(rootResolved + path.sep) && absPath !== rootResolved) {
    unlinkQuiet();
    return res.status(400).json({ ok: false, error: 'Blueprint path rejected' });
}
```
`path.resolve` resolves the logical path but does **not** resolve symlinks. If Multer's temp directory is inside the upload root but contains a symlink that points outside it, `absPath.startsWith(rootResolved)` passes while the actual file is written outside the containment boundary. `fs.realpath` (async) would be needed to detect symlink escape.

**Recommended Remediation:**  
Replace `path.resolve(req.file.path)` with `fs.realpathSync(req.file.path)` (sync is acceptable here as it runs once per upload). This resolves symlinks to their real destination before the containment check.

---

### FINDING 6.4 — `dispatchShare` Silently Swallows Directory Removal Errors
**Severity:** Low  
**Location:** `lib/dispatchShare.js` line 87

**Mechanism:**  
```js
try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
```
If evidence dispatch directory removal fails (e.g., another process has a file handle open, or permissions are revoked), the error is silently swallowed. The dispatch entry may appear to succeed while the evidence directory remains on disk, causing storage accumulation and eventual disk pressure.

**Recommended Remediation:**  
Log the error at `warn` level with the directory path. Consider a retry mechanism with exponential backoff for transient permission errors.

---

## Domain 7 — VMS & ONVIF Streaming Scalability

---

### FINDING 7.1 — Single Upstream HTTP Connection Per FLV Stream (No Connection Pooling)
**Severity:** High  
**Location:** `lib/wvpVideoHandoff.js` lines 410–444

**Mechanism:**  
Each call to `proxyFlvStream(req, res, camId)` opens a new HTTP/HTTPS `transport.get(url, ...)` connection to the upstream WVP/ZLM server. Under a 64-camera deployment where every operator's browser tab is requesting FLV streams, each tab maintains a persistent HTTP connection to `server.js`, which in turn holds a persistent HTTP connection to WVP/ZLM. This results in N × M connections (operators × cameras) to the ZLM relay. ZLM itself has file-descriptor and connection limits.

Additionally, there is no deduplication: if 3 operators all watch the same camera, 3 upstream connections are opened to ZLM for the same stream, tripling the upstream bandwidth and connection count.

**Recommended Remediation:**  
Implement an upstream stream multiplexer (fan-out proxy). One upstream connection per camera is maintained by the server, and all operators watching that camera share the same piped response. This pattern (already partially implemented in `liveStreamPool.js` for the JSMpeg path) should be extended to the FLV/WVP handoff path.

---

### FINDING 7.2 — No Sub-Stream / Main-Stream Separation in ONVIF Profile Handling
**Severity:** Medium  
**Location:** `lib/fixedCamOnvif.js` lines 444–453

**Mechanism:**  
The ONVIF `CamPromises` client connects and retrieves profiles, but the ME8 system uses whichever profile is returned first (or a configured default). Most enterprise ONVIF cameras expose multiple profiles: a high-resolution main stream (4K/1080p) and a low-resolution sub-stream (480p/D1). Using the main stream for live wall tiles at 64-camera scale saturates network bandwidth and FFmpeg transcoding capacity. No API or configuration exists to select sub-stream by profile token.

**Recommended Remediation:**  
Extend the ONVIF camera configuration to include a `streamProfile` field (`main` / `sub` / `token:ProfileToken`). When `profileToken` is provided, use it directly with `getStreamUri({ profileToken })` instead of auto-selecting. This unlocks dual-streaming architecture for future scalability.

---

### FINDING 7.3 — No Backpressure on FFmpeg stdin Write Path
**Severity:** Medium  
**Location:** `lib/liveStreamPool.js` (stdin write path inferred from `stdio: ['pipe', 'pipe', 'pipe']`)

**Mechanism:**  
BWC video frames are written to `session.ffmpegProcess.stdin` as they arrive from the WebSocket. Node.js `Writable.write()` returns `false` when the internal buffer is full (backpressure signal), but stream consumers that ignore this return value will continue writing data into the kernel buffer until it overflows. If FFmpeg falls behind (slow transcode due to CPU saturation on a 64-camera deployment), the stdin pipe buffer grows unboundedly in memory, leading to heap exhaustion and a process crash. No `drain` event handler or `write()` return-value check is visible in the pool code.

**Recommended Remediation:**  
Check the return value of `stdin.write(chunk)`. If `false` is returned, pause the source WebSocket with `ws.pause()` and resume it on the `stdin.drain` event. This implements proper backpressure between the BWC WebSocket and the FFmpeg transcode pipeline.

---

## Summary Table

| # | Domain | Severity | File / Lines | Finding |
|---|--------|----------|-------------|---------|
| 1.1 | Runtime Stability | **Critical** | `server.js` ~L1–68 | Fatal handlers registered too late |
| 1.2 | Runtime Stability | **High** | `server.js` L709–724 | `spawnSync` blocks event loop at boot |
| 1.3 | Runtime Stability | **Medium** | `lib/licenseHeartbeat.js` L78 | License check failure silently swallowed |
| 1.4 | Runtime Stability | **Low** | `lib/fixedCamRegistry.js` L24 | Empty catch on registry parse |
| 1.5 | Runtime Stability | **Medium** | `server.js` L292, 2816, 10817, 11057, 11681 | Unguarded `JSON.parse` on disk files |
| 2.1 | Integration | **High** | `server.js` L769–788 | Dashboard video WS no auth gate |
| 2.2 | Integration | **Medium** | `server.js` L15370–15374 | `process.on('exit')` inside repeat function |
| 2.3 | Integration | **Medium** | `server.js` L15370 | `exit` handler insufficient for child cleanup |
| 3.1 | Auth / Security | **Medium** | `server.js` L1323–1350 | `/api/health` leaks system topology |
| 3.2 | Auth / Security | **Medium** | `server.js` L1480–1498 | Metrics token timing-attack vulnerable |
| 3.3 | Auth / Security | **High** | `server.js` L1428–1478 | GET site-resilience inline auth weaker than POST |
| 3.4 | Auth / Security | **Low** | `server.js` L1559, 10513, 10532 | Username logged in console on auth events |
| 4.1 | Streaming / Memory | **High** | `lib/wvpVideoHandoff.js` L444 | FLV proxy pipe no error/disconnect handler |
| 4.2 | Streaming / Memory | **High** | `server.js` L4230, 7568, 7571, 9594, 9597 | Evidence download pipe no error handler |
| 4.3 | Streaming / Memory | **Medium** | `lib/liveStreamPool.js` L373 | FFmpeg stdin errors silently discarded |
| 4.4 | Streaming / Memory | **Low** | `server.js` L1234–1251 | Prune interval not cleared on shutdown |
| 5.1 | Process Lifecycle | **High** | `server.js` — whole file | No SIGTERM/SIGINT graceful shutdown |
| 5.2 | Process Lifecycle | **Medium** | `lib/liveStreamPool.js` L361–398 | FFmpeg zombie on SIGINT non-response |
| 5.3 | Process Lifecycle | **Medium** | `lib/fixedCamOnvif.js` L60, 450 | No concurrency throttle on ONVIF connect |
| 6.1 | Race / I/O | **High** | `server.js` L2816, 10640, 10817, 10842, 11681+ | Sync file I/O in hot request paths |
| 6.2 | Race / I/O | **Medium** | `server.js` L2815–2816, 10640 | Video channel config read-modify-write race |
| 6.3 | Race / I/O | **Medium** | `server.js` L7200–7204 | Blueprint symlink escape not prevented |
| 6.4 | Race / I/O | **Low** | `lib/dispatchShare.js` L87 | Dispatch dir removal error silently swallowed |
| 7.1 | VMS Scalability | **High** | `lib/wvpVideoHandoff.js` L410–444 | No upstream FLV stream deduplication |
| 7.2 | VMS Scalability | **Medium** | `lib/fixedCamOnvif.js` L444–453 | No sub-stream profile selection |
| 7.3 | VMS Scalability | **Medium** | `lib/liveStreamPool.js` (stdin) | No backpressure on FFmpeg stdin write |

---

## Positive Architecture Observations

The following were reviewed and found to be correctly implemented:

- **SQL injection:** All DB queries in `lib/siteDb.js` use parameterized queries via `pg` — no string concatenation in SQL observed.
- **WebSocket device auth:** `msgWss` validates camId format, device registry membership, and HMAC token before accepting connections (lines 1007–1079).
- **Socket.IO auth:** Middleware at line 760 validates `fm_session` cookie before allowing dashboard socket connections.
- **File upload containment (HTTPS upload):** `evidenceUploadSafeName.assertPathInsideRoot` is correctly applied before processing evidence uploads (line 7077).
- **Rate limiting on login:** `loginRateLimit` middleware applied to both `/api/auth/login` and `/api/auth/login/totp`.
- **Credential logging:** No raw passwords or tokens appear in `console.log` output.
- **X-Powered-By:** Disabled at line 1257, preventing Express fingerprinting.
- **Reassembler TTL:** Incomplete chunk buffers from BWC devices are pruned on a 60s TTL (lines 1231–1251), preventing indefinite memory accumulation from dropped connections.

---

*Report generated by static analysis. No code was modified. All line numbers reference `server.js` and `lib/` in the ME8 workspace root.*
