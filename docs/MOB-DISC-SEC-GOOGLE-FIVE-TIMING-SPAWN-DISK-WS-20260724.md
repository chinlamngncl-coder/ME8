# MOB DISC — Google security five (timing / spawn / disk / reassembler / msgWss auth)

**Date:** 2026-07-24  
**Source:** Google vulnerability list (operator paste) — **second wave** after earlier Google four (`MOB-DISC-SEC-GOOGLE-FOUR-FINDINGS-PLAN.md`)  
**Status:** **RECORDED · PRIORITY · PARKED until Tactical genre hands off**  
**Tone:** Treat as **serious**. Google is not gospel, but every item below was **verified against current `server.js` / `lib/hdaMessageProtocol.js`**.  
**Code policy:** **Zero patch until named `MOB-APPLY`** after Tactical (operator order: *mob after tactical*).

---

## Operator lock

| Rule | Meaning |
|------|---------|
| **Priority** | Security genre jumps **ahead of Turf / dual-pane / ship polish** once Tactical pin-mount path is handed off or operator says start SEC |
| **Care** | One MOB (or one small named batch) at a time; prove lab BWC + companion + evidence upload after each high-risk change |
| **No freestyle** | Do not “quietly harden” during Tactical APPLY |
| **Breaking changes** | Task 5 (msgWss token) needs **device URL contract** — companion/firmware must be planned before APPLY |

---

## Verified vs Google (current tree)

| # | Google claim | Verified? | Severity (honest) | Risk if ignored |
|---|--------------|-----------|-------------------|-----------------|
| **1** | `secureTokenEqual` leaks token length via early length mismatch | **YES** — `a.length === b.length && crypto.timingSafeEqual(a, b)` in `server.js` | **Medium** (timing side-channel on `FM_BWC_COMPANION_TOKEN`) | Attacker with timing oracle narrows secret length / speeds brute |
| **2** | `/api/sos-incidents/open` uses `cmd.exe /c start` for report | **YES** — folder uses `explorer.exe`; **report** still `cmd.exe` | **Low–Medium** (local desk, path from our incident store; still bad pattern) | Path metacharacters → command injection on Windows desk |
| **3** | Evidence HTTPS upload no free-disk gate before multer | **YES** — `/api/evidence/upload` → `httpsUploadMiddleware.single('file')` (up to large limits) with no `statfs` pre-check | **Medium** DoS | Fill disk → Fleet/evidence/OS failure |
| **4** | `MessageReassembler` incomplete chunks live forever | **YES** — `ingest` / no `pruneStaleBuffers`; cleared mainly on socket close | **Medium** | Dropped device → RAM growth → OOM |
| **5** | `msgWss` accepts any known `user=camId` without proof | **YES** — `isKnownMsgWssDevice(urlCamId)` only; then bind + `login success` | **High** | Spoof camId → messaging / spoofed device channel |

Earlier Google four (path traversal, login LRU, uncaught exit, SIP crypto) are a **separate** track — several already APPLIED. **This disc is the new five only.**

---

## Genre name (when we open it)

**`SEC-GOOGLE-FIVE-20260724`**

Apply order (locked unless operator overrides a number):

| Order | MOB name | Why this order |
|-------|----------|----------------|
| **1** | `SEC-MSGWSS-HMAC-AUTH-V1` | **Highest** — auth bypass; do first when SEC starts |
| **2** | `SEC-BWC-COMPANION-TIMING-SAFE-HASH-V1` | Timing-safe companion token (hash then `timingSafeEqual`) |
| **3** | `SEC-SOS-OPEN-EXPLORER-NO-CMD-V1` | Drop `cmd.exe`; open report via `explorer.exe` |
| **4** | `SEC-EVIDENCE-UPLOAD-FREE-DISK-V1` | `requireFreeDiskSpace` → 507 before multer |
| **5** | `SEC-MSG-REASSEMBLER-TTL-V1` | `pruneStaleBuffers(60s)` + interval on msgWss |

**Do not** bundle all five in one APPLY unless operator explicitly lists all five names.

---

## Task 1 — Timing-safe companion token (planned patch)

**Today (vulnerable pattern):**

```js
function secureTokenEqual(actual, expected) {
    if (!actual || !expected) return false;
    const a = Buffer.from(String(actual), 'utf8');
    const b = Buffer.from(String(expected), 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}
```

**Planned fix (Google method — APPLY later):**

- SHA-256 hash both UTF-8 strings  
- `timingSafeEqual` on the two digests (always 32 bytes)  
- Still reject empty actual/expected without leaking expected length via short-circuit on secret length  

**Files:** `server.js` (and ship/`run.js` parity if required by existing ship-security rules).

**PASS:** companion auth still works with correct `FM_BWC_COMPANION_TOKEN`; wrong token 401; no length short-circuit on raw secret buffers.

---

## Task 2 — SOS open without `cmd.exe` (planned patch)

**Today:**

```js
spawn('explorer.exe', [folderPath], { detached: true, stdio: 'ignore' }).unref();
// report:
spawn('cmd.exe', ['/c', 'start', '', reportPath], ...);
```

**Planned:** open `reportPath` with `explorer.exe` the same way as folder (no `cmd.exe`).

**PASS:** Incident Explorer still opens folder + report on Windows lab; no `cmd.exe` in this route.

---

## Task 3 — Free disk before evidence upload — **APPLIED 2026-07-25**

**APPLIED:** `MOB-APPLIED-SEC-EVIDENCE-UPLOAD-FREE-DISK-V1-20260725.md`

Async middleware `requireFreeDiskSpace`:

- `fs.promises.statfs(FTP_ROOT)` (Node 19+; lab Node 22+)  
- If `bfree * bsize < 5 * 1024^3` → **HTTP 507** before `httpsUploadMiddleware.single('file')`  
- Inject on `POST /api/evidence/upload` (+ twin `import-forensic`)

**PASS:** with artificially low free space (or mocked / static verify), upload blocked 507; normal lab upload still OK.

---

## Task 4 — Reassembler TTL — **APPLIED 2026-07-25**

**APPLIED:** `MOB-APPLIED-SEC-MSG-REASSEMBLER-TTL-V1-20260725.md`

**File:** `lib/hdaMessageProtocol.js` — `MessageReassembler`

- Track `lastTouched` per pending assembly  
- `pruneStaleBuffers(maxAgeMs)` delete stale entries  
- `setInterval` from `msgWss` setup in `server.js` / `run.js` (every 15s, `maxAgeMs = 60000`)  
- Also keep clear-on-close  

**PASS:** verify + Fleet restart OK (see `MOB-DISC-SEC-1-4-LAB-SMOKE-NO-CHUNK-DROP-20260725.md`).

---

## Task 5 — msgWss cryptographic auth — **APPLIED 2026-07-25**

**APPLIED:** `MOB-APPLIED-SEC-MSGWSS-HMAC-AUTH-V1-20260725.md`  
**Client URL Disc:** `MOB-DISC-SEC-1-5-MSGWSS-HMAC-CLIENT-URL-20260725.md`

- Require `token=` — `hex(HMAC-SHA256(secret, camId + "\\n" + devicePassword))`  
- Missing/invalid → `ws.close(4003, 'Unauthorized')` (**not** 4001)  
- `MsgServerUri` push includes `?user=&token=` when secret set  
- Flag: `FM_MSGWSS_REQUIRE_TOKEN` default on; lab escape `=0`

**PASS:** restart + BWC video OK (plain smoke).

---

## When to start (queue)

```text
NOW     → finish Tactical pin mount (1j) / Tactical handoff
NEXT    → SEC-GOOGLE-FIVE genre starting at SEC-MSGWSS-HMAC-AUTH-V1
THEN    → remaining four SEC MOBs in table order
PARKED  → Turf / dual-pane stay behind this security genre unless operator overrides
```

### First command when SEC opens

`MOB-APPLY SEC-MSGWSS-HMAC-AUTH-V1`

(Only after Tactical handoff or explicit “start security now”.)

---

## Agent must NOT

- Patch these five during Tactical pin/zone APPLYs  
- Soft-pedal Task 5 as “lab only”  
- Change device URL contract without documenting companion/BWC impact  
- Claim “already fixed” without verify scripts + operator PASS  

---

## Related docs

- Prior wave: `docs/MOB-DISC-SEC-GOOGLE-FOUR-FINDINGS-PLAN.md`  
- Handoff: `docs/MOB-DISC-THIRD-PARTY-SECURITY-HARDENING-HANDOFF-20260722.md`  
- Ladder: `docs/MOB-DISC-APPLY-PRIORITY-LADDER-20260724.md` (SEC block added)

Until APPLY — **zero code** on these five.
