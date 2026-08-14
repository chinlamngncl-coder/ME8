# MOB DISC — Fleet presence flap under ANPR (grab rate LOCKED)

**Date:** 2026-08-11  
**Status:** DISC only — no code until named APPLY below  
**Operator correction:** **No less grab.** 150ms cadence stays. Do not “fix” flap by slowing Stage‑1 ingest.

---

## Plain English

Fleet Online/Offline flaps because **Node SIP presence** (`lastSeen` / `keepalive_timeout` 90s) shares the **same Node process** as ANPR grab → track → harvest.

ANPR sidecar can still return plates while Fleet looks offline. That is presence starve, not dead cameras.

**Wrong fix (REJECTED):** raise `FM_ANPR_GRAB_MS` / go back to 333ms.  
**Right fix:** keep **150ms grab**, stop **blocking / stampeding** the Node event loop on the hot path so SIP REGISTER / touch still run.

---

## Locked product facts

| Item | Lock |
|------|------|
| Grab cadence | **Stay ~150ms** (`FM_ANPR_GRAB_MS` default 150) |
| Multi-target | Stay on |
| OCR quality path | Do not gut FastALPR / CCPD |
| Presence “fix” | Do **not** raise `DEVICE_OFFLINE_MS` to hide starve |
| WVP / Firmware Gold | Do not touch |

---

## What actually hurts presence (not “FPS number”)

Hot path today in `lib/anprLivePoller.js`:

1. **`fs.writeFileSync`** on every frame / crop (blocks event loop).
2. **Unbounded concurrent `/read-macro`** prefetch (`Promise.allSettled` on all harvest jobs) — long `harvestBusy`, CPU/network pile-up.
3. Many **ffmpeg/HTTP grabs** overlapping without yield → SIP UDP / timers delayed under load.

Grab **timer** can stay 150ms. Problem is **sync work + OCR stampede**, not the interval itself.

---

## Recommended APPLY (single) — grab stays

### `MOB-APPLY ANPR-PRESENCE-YIELD-KEEP-GRAB-V1`

**Intent:** Same ingest rate. Yield + non-blocking I/O + OCR in-flight cap so Fleet presence stays Online.

**Patches (small, targeted):**

1. **`lib/anprLivePoller.js` only** (and tiny helper if needed — no SIP rewrite)
   - Keep default **`GRAB_MS = 150`**.
   - Replace hot-path **`writeFileSync` → `fs.promises.writeFile`** (tmp frame + crop saves).
   - After each cam grab batch / before heavy harvest: **`await new Promise(r => setImmediate(r))`** so SIP timers get a turn.
   - Cap **OCR in-flight** (e.g. semaphore **2–3**) for `/read-macro` prefetch — still multi-target observe; OCR queues instead of stampeding. **Does not slow grab.**
   - Do **not** restore “skip producer when busy” as a grab-rate cut; if busy, drop-oldest queue already keeps newest frame (existing design).

2. **Out of scope:** `server.js` presence timers, `video-wall.js`, sidecar OCR models.

**PASS:**

1. Restart Fleet + ANPR; hard refresh.  
2. Live ANPR on, grab stays aggressive.  
3. Ops roster **≥5 min** — no Online↔Offline flap.  
4. Multi-car plates still appear.

**FAIL next (only if needed):** move ANPR poller to a **worker thread / child process** (`ANPR-POLLER-WORKER-V1`) — still no grab cut; bigger MOB.

---

## Explicitly cancelled from prior disc

- ~~Default grab back to 300ms~~ — **cancelled**  
- ~~Busy backoff that reduces effective grab rate~~ — **cancelled as primary fix**

Supersedes the APPLY name `ANPR-LOAD-PRESERVE-PRESENCE-V1` in the earlier draft of this topic.
