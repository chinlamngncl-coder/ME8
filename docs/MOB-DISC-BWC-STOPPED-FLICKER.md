# MOB DISC — “Stopped by BWC” flicker (bench)

**Status:** Open — **soak PASS 2026-07-06** (`docs/MOB-DISC-GATE-A-SOAK-PASS.md`); alt-tab retest optional  
**Search:** `Stopped by BWC`, `stoppedOnDevice`, `device_bye`, `stall`, `background tab`, `Opera`, `Cursor`

**100% fallback floor:** `BASELINE-ME8-FIRMWARE-GOLD.md` → `RUN RESTORE-ME8-FIRMWARE-GOLD`  
**Pin mirror rules:** `docs/MOB-DISC-FIRMWARE-GOLD-PIN-MIRROR.md`  
**Google paste:** `docs/MOB-DISC-ASK-GOOGLE-ZLM.md`

---

## Plain answer (operator)

**Your Firmware Gold code is still in place.** This is **not** the failed ZLM MOB. The yellow **“Stopped by BWC”** text is almost always the **browser** deciding video froze — often when you **leave Opera** (e.g. switch to Cursor) while Open All is running.

**You did not break the server.** The log at **1:18–1:21 AM** shows both BWCs still streaming on the server while the wall already showed “Stopped by BWC”.

---

## Compared to 100% fallback doc

From `BASELINE-ME8-FIRMWARE-GOLD.md` fallback ladder:

| Check | 2026-07-06 bench |
|-------|------------------|
| **Firmware Gold on disk** | `video-wall.js` + `liveStreamPool.js` **hash-match** Gold snapshot |
| **ZLM pool hooks** | **Not loaded** (`server.js` has no `zlmIngest`; orphan `lib/zlmIngest.js` unused) |
| **Restore needed for “wrong code”?** | **No** — revert already done; problem is **client overlay logic**, not missing restore |
| **When to restore anyway** | Sticky broken state after agent pass → you type **`RUN RESTORE-ME8-FIRMWARE-GOLD`** |

**Do not** restore hoping it fixes alt-tab stall — Gold **already includes** the 2.8s stall rule that causes this.

---

## Log evidence (agent read `storage/fleet.log`)

### Session A — ~01:09–01:10

| Time | Log | Meaning |
|------|-----|---------|
| 01:09:42 | `pool invite sending` Chin + kk | Open All started |
| 01:09:43–47 | `pool rtp received`, `pool ws first chunk` | **Live video OK** |
| 01:10:19 | `stop-video from dashboard` … `remainingViewers: 0` | Dashboard told server to stop (not BWC BYE) |
| 01:10:19–20 | `pool ffmpeg exit` / `pool stream stopped` | Server obeyed stop |

**No** `pool remote bye` at 01:10.

### Session B — ~01:18–01:21 (your FAIL ~1:20, Cursor ↔ Opera)

| Time | Log | Meaning |
|------|-----|---------|
| 01:18:09 | Open All again — RTP + first chunk both cams | **Live OK** |
| 01:18:10 → 01:21+ | `live voice hint probe` every ~3s both cams | **Server still streaming entire time** |
| 01:18–01:21 | **No** `stop-video`, **no** `pool remote bye`, **no** `ffmpeg exit` | BWC did **not** stop; server did **not** stop |

**Conclusion:** Screenshot with **STOPPED BY BWC** on both panels while map still shows **PATROL / online** = **client-only overlay** (stall watch), not server failure and not ZLM.

### Only real device BYE today

| Time | Log |
|------|-----|
| 00:49:32 | `pool remote bye` Chin — `dashboardActive: true` |

That is the classic SIP BYE path. **Once** in the whole Jul 6 log.

---

## What the code does (Firmware Gold — locked)

| Trigger | Where | Overlay text |
|---------|-------|----------------|
| SIP BYE | `server.js` → `video-stream-stopped` `reason: device_bye` → `markBwcStoppedOverlay` | **Stopped by BWC** |
| **~2.8s no decoded frame** | `video-wall.js` `BWC_VIDEO_STALL_MS` + `ensureBwcStallWatch` → `markBwcStoppedOverlay` | **Stopped by BWC** |
| Operator stop | `stop-video` → `teardownWallPin(..., 'operator')` | **Stopped — press ▶** (different string) |

**Session B (1:20)** matches **stall watch**, not operator stop and not server BYE.

---

## Likely cause: Opera backgrounded (Cursor focus)

When you **alt-tab to Cursor**:

1. Opera throttles or pauses JSMpeg canvas decode.  
2. `noteVideoFrame` stops updating `lastVideoFrameAt`.  
3. After **2.8s**, stall watch calls `markBwcStoppedOverlay` → yellow **Stopped by BWC**.  
4. Server keeps sending RTP (probes in log prove it).

**This is a bench-testing artefact**, not proof that Firmware Gold regressed.

---

## Operator bench rules (until MOB fixes stall)

| Do | Don’t |
|----|--------|
| Stay on **Opera → Operations** tab during Open All soak test | Alt-tab to **Cursor** while live video is under test |
| **Hard refresh** (Ctrl+Shift+R) after a false STOPPED overlay | Assume restore will fix alt-tab (it won’t — same stall code is in Gold) |
| Reply **PASS** / **FAIL** only | Read logs or DevTools |

If you **must** use Cursor while live is on, expect **FAIL** on this bench until `mob-me8-bwc-stall-background-tab` ships.

---

## What we will MOB (when you say MOB-APPLY — not now)

**One MOB only** — name TBD, likely:

**`mob-me8-bwc-stall-background-tab`**

- **File:** `public/js/video-wall.js` only (named MOB + your approval).  
- **Change:** Pause or disable `ensureBwcStallWatch` while `document.hidden` (tab in background); resume on `visibilitychange` when visible.  
- **Do not touch:** `liveStreamPool.js`, `server.js`, SIP, ZLM, pin mirror attach path.

Optional follow-up (separate MOB): debounce `device_bye` overlay when server keeps `dashboardActive` — needs Google Gate A answer first.

---

## What we will NOT do

- Another ZLM / pool MOB  
- Restore stack without your **`RUN RESTORE-ME8-FIRMWARE-GOLD`** phrase  
- Patch `video-wall.js` blind during SMTP / auth / settings MOBs  
- Claim PASS while alt-tabbing during soak test

---

## Operator recovery (now)

1. Hard refresh Opera (Ctrl+Shift+R).  
2. Operations → Open All Chin + kk.  
3. **Keep Opera focused** 2+ minutes.  
4. PASS or FAIL.

If still broken **while Opera stays focused**: type **`RUN RESTORE-ME8-FIRMWARE-GOLD`**, then `RESTART-FLEET.bat`, hard refresh, retry once.

---

## Recovery genre — restore video first, auth second (2026-07-06)

**Your idea is correct.** Super-admin auth (SMTP, TOTP bench) does **not** touch live video. Do this in order:

| Step | Who | What |
|------|-----|------|
| 1 | You | **`RUN RESTORE-ME8-FIRMWARE-GOLD`** |
| 2 | You | **`RESTART-FLEET.bat`** + hard refresh Opera |
| 3 | You | Open All Chin + kk — **Opera stays focused** — reply **CHECKPOINT PASS** |
| 4 | Agent | **`MOB-APPLY mob-me8-auth-totp-suspend`** (bench only) |
| 5 | Agent | **`MOB-APPLY mob-me8-auth-smtp-settings`** (re-apply after restore wipes it) |
| 6 | You | Test SMTP in Settings only — **not** during Open All soak |

**Restore wipes:** TOTP suspend hook, SMTP UI/routes, `platform-smtp.js`. **Restore keeps:** `storage/`, `.env`, users, secrets.

**Do not** mix ZLM, stall MOB, or Settings testing during step 3 checkpoint.

---

## Log timeline tonight (why it looked like “auto cut”)

| Time | What happened | BWC hardware |
|------|----------------|--------------|
| 01:10 / 01:22 | Dashboard **`stop-video`** — viewer count 0 | **Not** shut down — server stopped live relay |
| 01:18–01:21 | Server still streaming; wall showed STOPPED / SIGNAL LOST | **Online** — UI lied |
| 01:24:40 | **Fleet restart** (you or agent) | BWCs still registered SIP/PTT |
| 01:24:42 | WS **queued** — Open All before invite completed | Confusing “offline” popups |
| 01:27–01:28 | SIP **`pool remote bye`** during live | Firmware sent BYE — known flicker |

**No** `ShutDown`, `Reboot`, or `Lock` in log — nothing remote-killed your BWCs.

**VIDEO SIGNAL LOST** (red) = client stall path. **BWC Offline** on map = stale telemetry (`battery —`, `video 0`) while SIP still says ONLINE.

**Cursor ↔ Opera:** background tab → decode pauses → false STOPPED / SIGNAL LOST. Not auth.

---

## Related

- `MOB-DISC-START-HERE.md`  
- `docs/MOB-DISC-ZLM-NOT-READY.md` — ZLM parked  
- `docs/MOB-DISC-ASK-GOOGLE-ZLM.md` — Problem B for Google
