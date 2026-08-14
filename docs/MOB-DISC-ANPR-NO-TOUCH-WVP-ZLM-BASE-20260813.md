# MOB DISC — ANPR must not touch WVP/ZLM base (2026-08-13)

**Status:** LOCKED  
**Product:** Mobility Axiom (ME8)  
**Trigger:** Operator fear that ANPR “watch start URL” work would harm WVP concurrent-stream base.

---

## Hard lock (death sentence if broken)

**Do NOT change** for ANPR plate/Paddle work:

- `lib/wvpVideoHandoff.js` (especially `ensurePlay`, `startPlay`, stop/lifecycle)
- ZLM / WVP compose, proxy, FLV wall path
- SIP / PTT / pin-mirror firmware gold cores
- Any “ANPR calls `ensurePlay` every second” design (already **reverted**; stays forbidden)

WVP/ZLM remains the video base. ANPR is a **consumer** of an already-live upstream URL, not a second play owner.

---

## What already happened (honest)

| Action | Harm WVP? |
|--------|-----------|
| Temporary `ensurePlay` inside ANPR sync | **YES — risk.** Removed. |
| PaddleOCR in subprocess worker | No |
| Logs on `/watch/start` / capture open | No |
| Read-only `getUpstreamFlv` | No |

**Current FAIL:** Live tile shows the car; Python never gets `POST /watch/start`. That is an **ANPR handshake** gap, not a reason to reopen WVP.

---

## Paddle is not the blocker right now

Paddle worker only runs **after** a plate crop exists.  
No `/watch/start` → no frames → Paddle correctly does nothing.

Fixing Paddle alone cannot fill Recent Plates while capture is off.

---

## Allowed solution space (ANPR-only)

Any next APPLY must stay **outside** WVP/ZLM core files:

1. **Timing only (safest):** When ANPR Live tile already attached FLV via the **existing** handoff API (same path wall/tiles already use), re-emit `anpr-watch-slots` so Fleet retries read-only `getUpstreamFlv` — no new play, no WVP edit.  
2. **Diagnostics:** Fleet log `skip watchStart / no_upstream_flv` (already) — operator checks Fleet console.  
3. **Paddle:** Keep subprocess isolation; tune worker only inside `anpr-sidecar/paddle_ocr_*.py` + `dual_lpr.py`.

**Forbidden “solutions”:**

- ANPR-owned `ensurePlay` / `startPlay` / stop storms  
- Editing WVP handoff “just for ANPR”  
- Turning handoff off / parking ZLM  

---

## One next APPLY name (if operator wants code)

`ANPR-NATIVE-REEMIT-SLOTS-AFTER-TILE-FLV-V1`

- Files: `public/js/anpr-live-watch.js` (+ maybe `lib/anprLivePoller.js` logs only)  
- **Not** `wvpVideoHandoff.js`  
- Intent: after tile FLV is already live from existing path, tell Fleet again so read-only URL lookup succeeds  

Paddle APPLY stays separate: worker already exists; use only after capture PASSes.

---

## Operator remember

- Home: `C:\ME8`  
- ANPR bat = engine window; Fleet console = `[anpr-native]` lines  
- Seeing the car ≠ Python reading the car  

**Agent pledge:** no WVP/ZLM base edits for this ANPR/Paddle track unless operator explicitly names that file and MOB.
