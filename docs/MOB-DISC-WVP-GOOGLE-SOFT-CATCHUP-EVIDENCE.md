# MOB DISC — Google soft catch-up + focus snap + server record (knowledge share)

**Date:** 2026-07-15 ~00:59  
**Status:** DISCUSSION only — **no APPLY**  
**Tone:** Share with Google-style engineering notes. Take what fits Mobility Axiom; reject what fights our locks.  
**Operator constraint (important):** Prefer **no hard jump** for normal creep — operators must not miss split-second events. Flawless **master record** required.

**Siblings:**  
`MOB-DISC-WVP-GOOGLE-FRONTEND-LIVE-EDGE.md`  
`MOB-DISC-WVP-NEXT-MOB-ONLINE-FINDINGS.md` (`mob-wvp-lab-mpegts-live-chase`)

---

## How this paste changes our “later MOB”

Earlier we were willing to turn on **both** mpegts `liveSync` (soft) **and** `liveBufferLatencyChasing` (hard jump).

**New product rule from you / this paste:** soft first; hard jump only as **emergency** (e.g. delay &gt; ~10 s after Wi‑Fi hole), not the normal path.

| Google # | Idea | Fit for us |
|----------|------|------------|
| **1 Soft catch-up** | `playbackRate` 1.1 when buffer debt &gt; 1.5 s | **Strong — prefer this** |
| **1b Emergency jump** | `currentTime = end` only if delay &gt; 10 s | **OK safety net** — not everyday chase |
| **2 Tab focus snap** | `visibilitychange` → jump to live | **Strong** — tab/TV multi-task builds debt (tonight Wi‑Fi + other tab class) |
| **3 Server MP4 master** | ZLM/WVP record RTP → disk | **Agree in principle** — Evidence not from browser speed-up |

---

## Score each directive vs our desk

### 1) Soft catch-up (playbackRate) — not hard jump

| | |
|--|--|
| **Agree** | Same physics as mpegts **`liveSync`** (CN #259: 平滑追帧) |
| **Better than raw drag/jump** | Digests backlog; keeps frames (sped-up), no skip hole |
| **Caveat** | 1.1× still “time compression” — rare events in that window play faster, not deleted; honest ops brief |
| **mpegts native** | Prefer **`liveSync: true`** (+ max/target/rate) over hand-rolled `setInterval` when possible — less duplicate timers next to our 15 s keepalive |
| **Custom interval** | Fine if native liveSync insufficient; use **last** `buffered.end`, pad slightly, reset rate to 1.0 |

**Adjust named MOB:**  
`mob-wvp-lab-mpegts-live-chase` → implement as **soft-first**:

1. Enable **`liveSync`** (or equivalent rate loop)  
2. **Do not** enable everyday `liveBufferLatencyChasing`  
3. Optional: only if debt &gt; **10 s**, one jump (Google emergency) **or** reopen play once  

Rename clarity optional later: `mob-wvp-lab-mpegts-live-sync` — same job, softer brand.

### 2) Snap to live on tab focus

| | |
|--|--|
| **Agree** | Background tab throttle = huge buffer debt (matches “broke while TV / other window”) |
| **We have today** | `visibilitychange` → `kick()` unmute/`play()` + stall reopen — **does not** seek live edge |
| **Gap** | On `document.hidden === false`, also soft-catch or emergency snap |
| **Ops** | When returning to dashboard, expect one brief catch-up — better than 30 s late forever |

Fits same Lab tile MOB (don’t need a third genre).

### 3) Decouple live view from evidence (server record)

| | |
|--|--|
| **Agree** | Browser must not be forensic master if it rates/snaps |
| **Already partially true** | Last soaks already saw ZLM/WVP **录像完成** / MP4 under `record/rtp/…` — platform **can** record on play |
| **Product** | Mobility Evidence / vault must stay **1.0× continuous** from server path — not screen capture of Lab tiles |
| **Caution** | Always-on `record_mp4` for every BWC invite = **disk**, retention, privacy — needs named Evidence MOB + policy, not silent Lab latency APPLY |
| **Do not** | Bundle “turn on record forever” inside the mpegts soft-chase MOB |

Separate later: `mob-wvp-evidence-server-record-policy` (or reuse Evidence genre) — prove record span matches play, path into vault, retention.

---

## What we will **not** treat as gospel

| Claim | Our note |
|-------|----------|
| Hard jump “drops frames” = always forbidden | Soft is preferred; **&gt;10 s** jump or reopen after Wi‑Fi may still be required so ops aren’t 30 s late |
| “Implement all 3 now as architecture” | One APPLY at a time; soft+focus first; record policy separate |
| Browser cannot help live | Soft catch-up **is** the live path; record is evidence path |

---

## Updated “what we test later” (still after soak)

**Primary (when you APPLY):**  
`mob-wvp-lab-mpegts-live-chase` **(soft-first)**  

- `liveSync` on (or custom rate loop to match paste)  
- Hard chase **off** for normal 1.5–10 s band  
- On `visibilitychange` visible: soft catch-up; if debt &gt; 10 s → one live snap  
- Lab tiles only; no wall; no stamp in same MOB  

**PASS:** 30+ min monitoring, no drag babysitting, no routine hard skips; hand lag mostly ~2–5 s.

**Parked sibling:** server record **policy** MOB for Evidence vault — confirm what already records vs product rule.

**Second knife (still):** `modify_stamp` only if soft chase PASS but residual stamp hell remains.

---

## One line

**Google’s soft playbackRate catch-up + focus snap matches our product need better than hard jump; fold both into the later Lab mpegts MOB (soft-first); keep server MP4 as Evidence policy, not a latency side-quest.**
