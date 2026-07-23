# MOB DISC — Fleet `EPIPE` uncaughtException loop vs ZLM

**Date:** 2026-07-15 ~02:28  
**Status:** DISC ONLY — no code patch until named `MOB-APPLY`  
**Trigger:** Google suggested special-casing `EPIPE` in the top `server.js` `uncaughtException` handler. Operator asks: is our server having this issue, or is it ZLM?

---

## Verdict

This is a **Fleet Node logging/stdout issue**, not a ZLM media issue.

Evidence:

| Check | Result |
|-------|--------|
| Current terminal logs | No current `EPIPE` / `uncaughtException` found |
| `storage/fleet.log` | Historical `EPIPE: broken pipe, write` loop found on **2026-07-06 00:26:26** |
| ZLM logs | ZLM emits media/stamp/player logs, not Node `EPIPE` |
| `server.js` | Top handler currently logs `uncaughtException — process kept alive`; fallback uses `console.error` |

So: **yes, our server has had this exact class before**, but I do **not** see it active right now. If you saw red text now, confirm the exact line; if it says `EPIPE: broken pipe, write`, it is Fleet stdout/stderr, not ZLM.

---

## What `EPIPE` means here

`EPIPE: broken pipe, write` means Node tried to write to a pipe that closed.

Common causes:

- terminal / log collector closed while Fleet still writes;
- service wrapper redirected stdout/stderr badly;
- console output pipe broke;
- parent process killed the output stream.

It does **not** mean:

- BWC video broke;
- ZLM RTP broke;
- WVP stream died;
- camera AES/SRTP issue.

---

## Why Google is partly right

Current top handler:

```js
process.on('uncaughtException', (err) => {
    try {
        log.web.err('uncaughtException — process kept alive', { ... });
    } catch (_) {
        console.error('uncaughtException', err);
    }
});
```

But `log.web.err()` calls `fleetLog.emit()`, and `fleetLog.emit()` does:

```js
console.log(line);
appendFileSync(fleet.log, line);
```

If `console.log()` itself throws `EPIPE`, then the uncaught handler tries to log the broken-pipe error, which can produce a loop.

That is exactly what the historical log shows:

```text
2026-07-06 00:26:26 ... uncaughtException — process kept alive
message: "EPIPE: broken pipe, write"
stack: ... at console.value ...
```

---

## Patch Strategy Later

Google’s proposed patch is directionally useful:

- if `err.code === 'EPIPE' && err.syscall === 'write'`, return without logging again;
- fallback should avoid `console.error`.

But for ship hardening, the better future patch should be a **two-part fix**:

### A. Immediate loop guard

Named MOB:

`mob-sec-epipe-log-guard`

Plan:

- At top `uncaughtException`, ignore stdout/stderr `EPIPE`.
- Use `process.stderr.write` fallback only inside `try/catch`.

### B. Harden `fleetLog.emit`

Named MOB or same security patch if scoped:

`mob-sec-fleetlog-safe-console`

Plan:

- Never let `console.log(line)` crash Fleet.
- Prefer append to `storage/fleet.log` first or wrap console write.
- If console pipe is broken, keep file logging alive.

This is cleaner than only patching `uncaughtException`, because normal `log.web.info()` calls can also hit a broken stdout pipe.

---

## Relationship To Existing Security Plan

This is related to, but separate from, `mob-sec-uncaught-exit`.

| MOB | Job |
|-----|-----|
| `mob-sec-epipe-log-guard` | Stop broken stdout/stderr from causing red loop |
| `mob-sec-uncaught-exit` | For real unexpected exceptions, exit and let service manager restart |

Order recommendation:

1. `mob-sec-epipe-log-guard`
2. `mob-sec-evidence-upload-safe-name`
3. `mob-sec-uncaught-exit` after restart manager proof

Do not let `EPIPE` special-case become an excuse to keep all fatal exceptions alive forever.

---

## Is ZLM involved?

No, not directly.

ZLM can be noisy. It can print stamp warnings, media register/unregister, player close, RTP shutdown. But Node `EPIPE` is about **Fleet writing to stdout/stderr**.

If the terminal shows:

```text
EPIPE: broken pipe, write
at console.value
```

that is **Fleet Node output pipe**.

If the terminal shows:

```text
Stamp expired is abnormal
媒体注销
RtpProcess onDetach
```

that is **ZLM/media**.

Different issue classes.

---

## One Line

**Confirmed historical Fleet `EPIPE` loop exists; I do not see it active now; it is not ZLM. Future patch should guard `EPIPE` in `uncaughtException` and harden `fleetLog` console writes.**
