# MOB DISC — Google: Soft Open UI race / zombie players · Vanilla JS answer

**Date:** 2026-07-17  
**Status:** DISC only — no code  
**Source:** Google “Fixing Soft Open UI Race Conditions & Zombie States”  
**Operator:** Stability required; answer framework question; do not freestyle a full rewrite without a named APPLY

---

## Answer first (Google’s last sentence)

**The Axiom / ME8 command dashboard is Vanilla JavaScript with direct DOM manipulation — not Vue, not React, not Angular.**

| Piece | Reality |
|-------|---------|
| Framework | **None** — plain JS |
| Main surfaces | `public/index.html` (large inline + scripts), `public/js/video-wall.js`, `public/js/dashboard-boot.js`, `public/js/live-player-factory.js` |
| Soft Open player | **mpegts.js** on wall `<video>` overlay (not flv.js / WebRTC) |
| Pin Soft Open | RAF **mirror** from wall video (not a second mpegts attach after pin-mirror MOB) |

Any “nextTick / Vue reactivity” advice must be translated to **rAF / setTimeout(0) + explicit DOM queries** in our stack.

---

## Google plan vs what we already have

### 1) Strict UI state machine (A→B→C→D)

| Google step | Soft Open today | Gap |
|-------------|-----------------|-----|
| **A Lock** — disable double-click, spinner | Partial — streaming overlay / wait label; **not** a hard Soft Open click lock | Double Soft Open / Open All can race |
| **B Fetch** — await `wvp-zlm` FLV | Yes — `fetchDescriptorPreferZlm` then attach | Keepalive reopen re-fetches → storm (other disc) |
| **C Build DOM after URL** | **Inverted** — wall **slot DOM already exists**; Soft Open attaches overlay into existing `.video-slot-stage`. Pin may get `ensureSoftOpenPinLiveChrome` **after** prove | Google’s “build pin/wall HTML only after URL” fights our wall grid model; **pin** rebuild-after-fetch is the dangerous half (fan storm — mitigated by reopen-no-fan MOB) |
| **D Attach after DOM exists** | Soft Open assumes stage exists; soft overlay creates `<video>` then mpegts | Race when stage wiped / ghost cleanup mid-fetch |

**Verdict:** Agree on **lock → fetch → attach → prove**. Do **not** rebuild the whole wall panel HTML per Soft Open (slots are permanent). Enforce sequence **inside Soft Open attach**, and never rebuild pin chrome on recover.

### 2) Eradicate zombie players

| Google | Soft Open today | Gap |
|--------|-----------------|-----|
| `player.destroy()` + null | `softAttach` destroy / `destroyZlmWallOverlay` calls `h.destroy()` | Need audit: every stop/error path removes overlay `<video>` and clears Map entries |
| Remove DOM, not `display:none` | Overlay remove on destroy; ghost cleanup removes soft overlays | Pin Stop now spares wall (good). Fail path still resets wall. Zombies more likely from **reopen without destroy** or **double softAttach** |
| Refresh leaves ghosts | Operator report matches | Hard refresh + leftover Maps if destroy skipped; also browser tab with stalled mpegts |

**Verdict:** Agree. Candidate MOB: Soft Open stop/fail/reopen always `destroy` → remove video → delete Map → null handle **before** next attach (idempotent).

### 3) Idempotent retry

| Google | Soft Open today | Gap |
|--------|-----------------|-----|
| Tear down before retry | Reopen path destroys overlay then re-attach | Still re-fetches broker URL; pin quiet resync only (fan MOB) |
| Clean state before auto-retry | Partial | Need single Soft Open **session token / generation** so late promises cannot attach into a stopped slot |

**Verdict:** Agree. Generation counter on Soft Open start/stop is the Vanilla way to kill races without React.

---

## What we must NOT do in one mega-APPLY

- Rewrite dashboard in Vue/React  
- Rebuild wall slot HTML on every Soft Open (breaks Firmware Gold / Open All model)  
- Re-enable Gate-B `liveBufferLatencyChasing` under “stability”  
- Bundle pin-stop, fan-storm, kill-reopen-storm, and full state machine in one shot  

Stability = **small named MOBs**, one at a time, operator PASS between.

---

## Already APPLIED (stability lane)

| MOB | Helps Google item |
|-----|-------------------|
| `mob-softopen-pin-stop-spare-wall-v1` | Pin Stop ≠ wall teardown / BYE |
| `mob-softopen-reopen-no-pin-fan-storm-v1` | Reopen ≠ pin DOM rebuild / fan jump |
| Keepalive reopen | Band-aid only — still a storm vs Google “no dashboard reopen” |

---

## Suggested named APPLY order (pick one)

| # | Candidate | Maps to Google |
|---|-----------|----------------|
| 1 | `mob-softopen-click-lock-v1` | Step A — Soft Open / Play disable until prove or fail |
| 2 | `mob-softopen-attach-generation-v1` | Race: ignore stale fetch; destroy before attach |
| 3 | `mob-softopen-zombie-destroy-v1` | Explicit destroy + DOM remove + Map clear on stop/error/reopen |
| 4 | `mob-softopen-kill-reopen-storm-v1` | Same-URL in-player recover + OSD; stop broker re-fetch loop |

Expected product result (goal, after series): one click → wait → picture; Stop cleans fully; no ghost players; no pin/panel fighting.

---

## One line

**Dashboard = Vanilla JS + mpegts Soft Open (not Vue/React/flv.js); Google’s A→D lock/fetch/attach is right in spirit — adapt to existing wall slots; kill zombies + generation races via named MOBs, not a framework rewrite.**
