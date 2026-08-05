# MOB DISC — Live FLV creep (8–10s+) + crops still missing (2026-08-02)

**Status:** DISCUSS ONLY — wait for `MOB-APPLY …`  
**Operator:** Live video slowly drifts late (~8–10s and growing). Crops still not appearing. Crop delay 2–3s OK; **live must not lag**.

---

## Plain English

Two **different** bugs. Treating them as one OCR mess made things worse.

| Symptom | Cause | OCR related? |
|---------|--------|--------------|
| Live video **creeps** later (8s → 10s → worse) | ANPR FLV player (`Me8LivePlayerFactory.attachFlvPrimary`) has **`liveBufferLatencyChasing: false` and NO soft live-edge chase**. Buffer piles up. Lab tiles already have soft chase (`wvp-lab-tile.js`); **ANPR/ops factory does not**. | **No** |
| No snapshot / crop on rail | Poller **drops the tick** unless a plate string exists: `if (!tick.plateCompact && !tick.plate) continue`. OCR timeout / blur / fail → **zero crops even when vehicle macro exists**. | Yes (emit gate) |

Locked rule stands: do **not** turn hard `mpegts` `liveBufferLatencyChasing` back on (that caused minutes lag before). Use the **proven soft chase** (playbackRate + emergency seek when debt is large).

---

## Why crops still fail after “fast path”

1. Track flush → `/read-macro` → pose + dual OCR.  
2. If OCR times out (2.5s), blur-rejects, or regex empty → `plate` null.  
3. Emit gate **requires a plate** → rail gets **nothing** (no macro, no micro).  

Operator asked: crop may be 2–3s late, but **must show**. So emit **vehicle macro (and micro if any) even when plate = Unclear**.

---

## Risk pick (one recommendation)

| Option | Verdict |
|--------|---------|
| **A. Soft live-edge on `attachFlvPrimary` + emit crops without plate** | **RECOMMENDED** |
| B. Re-enable hard `liveBufferLatencyChasing` | **Reject** (known minutes-lag failure) |
| C. Only raise OCR timeout | Incomplete — video still creeps; crops still gated on plate |

### `ANPR-LIVE-EDGE-SOFT-CHASE-AND-CROP-EMIT-V1`

**Scope:**

1. **`public/js/live-player-factory.js` — `attachFlvPrimary` only**  
   - Keep `liveBufferLatencyChasing: false`  
   - Add soft chase (same idea as `wvp-lab-tile`):  
     - soft rate if buffer delay &gt; ~1.0s  
     - emergency seek if delay &gt; ~3.5s (ANPR tighter than lab 10s — keep live near now)  
   - Clear chase timer on destroy  
   - **Do not** change Firmware Gold pin / wall JSMpeg paths  

2. **`lib/anprLivePoller.js`**  
   - On force-flush harvest: **always emit** if `vehicleUrl` / macro exists  
   - Plate optional → `Unclear / Manual Review` OK  
   - Target: rail card within **~2–3s** of vehicle leave  

3. **OCR**  
   - Keep HyperLPR off live default  
   - OCR timeout stay ≤4s (raise 2.5→3.5 if needed) — **never** block FLV  

4. **No** DeviceControl / pin mirror / ZLM “new stack”.

**PASS (you):**

1. Restart ME8 + hard refresh ANPR Live.  
2. Watch a clock / walk past cam — tile stays within ~1–2s of real life for several minutes (no creep to 8–10s).  
3. Vehicle past → **macro crop on rail within ~2–3s** even if plate text is Unclear.  

---

## Operator next

Say:

**`MOB-APPLY ANPR-LIVE-EDGE-SOFT-CHASE-AND-CROP-EMIT-V1`**

Until then: **no code**.
