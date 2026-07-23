# MOB DISC — Google: stall tolerance · kill reopen storm · honest OSD (not APPLY)

**Date:** 2026-07-17  
**Status:** DISC only — no code  
**Source:** Operator paste of Google suggestion “Fixing Playback Stalls & Killing the Reopen Storm”  
**Related:** 1h soak disc; keepalive APPLY (band-aid); pin-stop-spare-wall APPLY; parked Gate-B latency rule

---

## Answer first (Google’s last sentence)

**Command Wall Soft Open / ZLM FLV is rendered with mpegts.js — not flv.js, not WebRTC.**

| Question | Answer |
|----------|--------|
| Player on Soft Open wall | **mpegts.js** (`public/vendor/mpegts.min.js`) |
| Entry | `Me8LivePlayerFactory.softAttachZlmOverlay` → `mpegts.createPlayer({ type: 'flv', isLive: true, … })` |
| flv.js? | **Not used** on this Soft Open / wall ZLM path |
| WebRTC? | **Not used** for Soft Open wall picture |
| Classic Fleet wall (non Soft Open) | Still **JSMpeg** on Fleet MPEG-TS WS (separate path) |

So any “increase auto-buffer / auto-resume” work must be aimed at **mpegts.js options + our Soft Open wrapper**, not flv.js or WebRTC knobs.

---

## Google asks vs ME8 reality

### 1) Player auto-recovery (frontend) — agree in principle, careful on knobs

Google wants: tolerate jitter; reconnect to **same** ZLM FLV under the hood; **no** full UI rebuild / dashboard reopen.

| Agree | Caution (locked history) |
|-------|---------------------------|
| In-player recover / resume without `fetchDescriptorPreferZlm` storm | Gate B: `liveBufferLatencyChasing` + stash-off recipe caused **minutes** lag — **PARKED** (user rule + `MOB-DISC-ZLM-OPTION-B-PROXY-DESIGN`) |
| Soft Open today: `enableStashBuffer: false`, `liveBufferLatencyChasing: false`, `hasAudio: false` (G.711) | Blind “increase buffer” can trade freeze for balloon lag |
| Reopen must **not** call `ensureSoftOpenPinLiveChrome` / fan refresh | Next named MOB already queued: `mob-softopen-reopen-no-pin-fan-storm-v1` |

**Direction for a later APPLY (not this disc):**

- Prefer: mpegts recover / unload+load **same URL** inside `softAttachZlmOverlay`, no broker re-fetch, no pin chrome rebuild.  
- Prefer: OSD “Weak Signal - Buffering…” over last frame.  
- Avoid: re-enabling hard `liveBufferLatencyChasing` as first move.  
- Soft Open keepalive **dashboard reopen loop** (re-`fetchDescriptorPreferZlm` every stall) = what Google wants **disabled** — agree.

### 2) ZLM stream tolerance (backend) — split two knobs

Soft Open picture uses **modern ZLM** (`:18088`), not only the old bundled 2021 all-in-one.

| Knob | Where | Current (repo) | Google ask |
|------|--------|----------------|------------|
| `streamNoneReaderDelayMS` | bundled + modern | often **60s** class | Keep play URL when **no readers** — already in ballpark |
| `continue_push_ms` | **`docker/wvp/zlm-modern/config.ini`** | **`3000` (3s)** | Keep stream on **publisher / TCP pause** 15–30s |

**Important:** Google’s “cam 4G dropped a packet / paused” maps closer to **`continue_push_ms`**, not none-reader delay. Lab modern config at **3s** is **shorter** than Google’s 15–30s ask — candidate for a later named ZLM MOB after player-storm kill (do not freestyle edit without APPLY).

### 3) Honest UI / session health (OSD) — agree; kill reopen storm — agree

| Google | ME8 stance |
|--------|------------|
| OSD “Weak Signal - Buffering…” on last frame | Good product copy; named MOB later |
| Disable aggressive backend keepalive that re-fetches `wvp-zlm primary` every few minutes | The storm is mostly **frontend Soft Open reopen** (descriptor re-fetch after stall) — that is what 1h soak showed; disable/replace that loop |
| Genuine cam loss / pause ≠ call storm | Already paper-locked in `MOB-DISC-SOFTOPEN-STALL-PAUSE-RES-MULTI-SITE-20260717.md` |

**Clarify:** There is no separate Fleet “backend keepalive” inventing new INVITEs every few minutes for Soft Open picture. Log lines `live broker wvp-zlm primary` on a timer were driven by **viewer reopen → re-fetch descriptor**. Killing that frontend loop is the main storm kill.

---

## Expected result (product) — locked as goal

- Stream plays continuously through minor cellular jitter.  
- Micro-drop → smooth buffering / OSD, **not** panel rebuild / pin fan jump / new Soft Open.  
- Real cam end / wearer pause → honest end state, **no** re-INVITE storm.  
- Pin Stop still spares wall (`mob-softopen-pin-stop-spare-wall-v1` already APPLIED).

---

## Suggested APPLY order (you choose names)

| # | Candidate | Scope |
|---|-----------|--------|
| 1 | `mob-softopen-kill-reopen-storm-v1` | Soft Open: stall → in-player recover / OSD; **stop** `fetchDescriptorPreferZlm` reopen loop (or hard-cap to 0 after prove) |
| 2 | `mob-softopen-reopen-no-pin-fan-storm-v1` | If any recover remains: no pin popup rebuild / fan |
| 3 | `mob-softopen-weak-signal-osd-v1` | “Weak Signal - Buffering…” over last frame |
| 4 | `mob-zlm-publisher-pause-tolerance-v1` | Verify/adjust **running** ZLM config for cam TCP pause (15–30s) — not only none-reader |

Do **not** APPLY Gate-B `liveBufferLatencyChasing` stash recipe without a new explicit MOB that accepts lag risk.

---

## One line

**Wall Soft Open ZLM = mpegts.js (not flv.js / not WebRTC); kill descriptor reopen storm; recover same FLV + OSD; ZLM none-reader already 60s — still audit publisher-pause; no latency-chasing revive without new APPLY.**
