# MOB DISC — 100% consolidation: Fleet functions vs WVP/ZLM harm

**Date:** 2026-07-20  
**Operator lock:** WVP/ZLM stays. Fleet stays. All functions must work. **No park. Fix.**

---

## What WVP/ZLM actually changed

**Only this on server when `FM_WVP_VIDEO_HANDOFF=1`:**

- `start-video` → **no Fleet SIP INVITE** → WVP `startPlay` → browser gets **`flvUrl`** (ZLM FLV on `:18088`).
- BWC still on **`:5060` WVP** for GB register / SOS Alarm.
- PTT still **Fleet `:29201`** (group XML may go via `:5060` relay).

**Everything else is still Fleet code** — but many UI paths still expect **Fleet MPEG-TS + JSMpeg canvas**. That mismatch is the damage.

---

## A. NOT harmed (keep working — do not redo)

| Function | Why OK |
|----------|--------|
| Login, roles, dispatch groups, users | No video pipe |
| Evidence catalog, upload, redact, custody, AES | No live player |
| FR alarm drawer, ledger, standby PTT **API**, snap | Not JSMpeg wall |
| SOS **cold** Alarm → ACL translator → banner | `:5060` + `wvpFleetAclTranslator` — PASS path |
| SOS ack, ledger scope, geofence, map pins (no video) | Fleet UI |
| Settings, server config, HTTPS upload | Independent |
| WVP docker, SIP proxy `:5060`, ZLM infra | Base — stays |
| Dashboard connect warm (WVP list → online) | Added for WVP presence gap |

---

## B. HARMED — live video (must fix, WVP stays)

| # | Function | Status with handoff ON | Cause | Fix MOB |
|---|----------|------------------------|-------|---------|
| B1 | **Ops map wall** — picture | ⚠ PARTIAL | FLV attached; audio dropped in FLV | Done / tune |
| B2 | **Ops map wall** — Open All / multi | ⚠ PARTIAL | FLV path; storms / dedupe MOBs helped | Stabilize |
| B3 | **Command Wall** — all slots | ✅ **PASS** | FLV via `attachFlvPrimary` | **`COMMAND-WALL-FLV-HANDOFF-V1`** — done |
| B4 | **FR live watch** tiles | ✅ **PASS** | FLV on handoff — Chin + kk | **`FR-LIVE-WATCH-FLV-HANDOFF-V1`** — done |
| B5 | **Panel popout** (`live.html`) | ✅ **PASS** | FLV popout | **`PANEL-POPOUT-LIVE-FLV-HANDOFF-V1`** — done |
| B6 | **Video matrix popout** (`matrix.html`) | ✅ **PASS** (V2 local FLV) | Close-safe = phase **5b** | **`VIDEO-MATRIX-POPOUT-FLV-LOCAL-ATTACH-V2`** |
| B7 | **Map pin video** | ⚠ Harden APPLIED — test | Mirror wall FLV `<video>` | **`PIN-FLV-MIRROR-HARDEN-V1`** |
| B8 | **Map popout mirror** | ⚠ Unknown | Depends on ops wall source | After B1/B7 |
| B9 | **Wall listen audio** (PCM WS) | ⚠ Likely broken | Tied to Fleet pool / INVITE; FLV has `hasAudio:false` | **`WALL-AUDIO-PATH-V1`** (separate from video) |
| B10 | **Conference — let BWC in** | ❌ **Broken under handoff** | `addBwcIngress` → `ensurePoolStreamForConference` → **Fleet SIP pool INVITE** + RTP mirror to LiveKit RTMP; BWC homed on **WVP `:5060`** — no Fleet RTP when handoff on | **`CONFERENCE-BWC-INGRESS-WVP-HANDOFF-V1`** (backend) |

---

## C. HARMED — video lifecycle / operator chrome (Fleet logic, canvas gate)

| # | Function | Status | Cause | Fix MOB |
|---|----------|--------|-------|---------|
| C1 | **Stopped by BWC** (wall) | ❌ | `markBwcStoppedOverlay` requires **canvas** | **`FLV-WALL-LIFECYCLE-PARITY-V1`** |
| C2 | **Video signal lost** (wall) | ❌ | Same canvas gate | Same MOB |
| C3 | **Stall watch → stopped** | ❌ | `camHasActiveLiveVideoSurface` = canvas only | Same MOB |
| C4 | **device_bye** chrome | ❌ | Calls C1 path | Same MOB |
| C5 | Stopped / signal on **pin** | ⚠ Partial | Pin mirror canvas sometimes | Same MOB + pin |
| C6 | **Operator Stop** | ⚠ Partial | FLV destroy vs JSMpeg | Same MOB |
| C7 | **SOS wall** stop rules | ⚠ | Mixed FLV + alarm UI | Test after C1 |

---

## D. HARMED — layout / UX (not WVP server — handoff UI side effects)

| # | Function | Status | Cause | Fix MOB |
|---|----------|--------|-------|---------|
| D1 | **Pin dock / 8 layout jump** | ⚠ Gate APPLIED — test | No auto-open-all on wall prove | **`PIN-FOCUSED-OPEN-V1`** |
| D2 | **Jul-19 panel 16:9 / rail width** | ❌ Lost | Jul-20 classic restore | **`REAPPLY-PANEL-16x9-V1`** |
| D3 | Auto-open all wall pins | ⚠ Annoying | Handoff `onProven` ≥2 cams | Gate in D1 |

---

## E. HARMED — voice / PTT (Fleet must work; WVP adjacent)

| # | Function | Status | Cause | Fix MOB |
|---|----------|--------|-------|---------|
| E1 | **Soft PTT / Call** `:29201` | ❌ Often | Cam homes `:5060`; no TCP login | **`PTT-29201-WVP-HOMED-V1`** (ongoing) |
| E2 | **PTT group XML push** | ⚠ Partial | `wvpPttGroupRelay` sends; device may ignore | camId map MOBs helped |
| E3 | **PTT GROUPS Join UI** | ❌ Blocked | Hard **2+** rule; 1-member group | **`PTT-GROUP-SELECT-1PLUS-V1`** |
| E4 | **HQ hold → team** | ⚠ | Works if 29201 up + team active | Depends E1 |
| E5 | **Field BWC → other BWC** | ❌ User expect | Server never relayed inbound `:29201` to peer team cams (classic same) | **`SOS-GROUP-FIELD-RX-RELAY-V1`** (phase 8 — mesh) |
| E6 | **Choppy PTT** | ⚠ | TCP churn / group refresh | Dedupe MOBs helped |

---

## F. HARMED — online / GPS / fleet list

| # | Function | Status | Cause | Fix MOB |
|---|----------|--------|-------|---------|
| F1 | **Online slow on refresh** | ⚠ | BWC on `:5060` not `:5062` | Dashboard warm MOB applied |
| F2 | **GPS slow** | ⚠ | `GPS_POLL_MS` 2 min default | Env / burst on warm |
| F3 | **Fleet roster vs WVP** | ⚠ | `FM_WVP_FLEET_PRESENCE=0` in lab | Warm on connect |

---

## G. Backend / pool side effects

| # | Item | Status | Notes |
|---|------|--------|-------|
| G1 | `liveStreamPool` / FFmpeg INVITE | **Bypassed** for video when handoff on | By design — but breaks anything still calling pool WS |
| G2 | `zlmIngest` tee from pool | **Unused** in handoff path | Old Gate B lab |
| G3 | Stop video / BYE | **WVP stopPlay** bridge | Ops stop MOBs applied |
| G4 | Duplicate startPlay storm | ⚠ | Handoff stable MOB helped |

---

## H. FIX ORDER (consolidated — no park, no new Fleet)

**Rule:** WVP/ZLM stays ON. One MOB → operator PASS → next.

| Phase | MOB | Restores |
|-------|-----|----------|
| **1** | `FLV-WALL-LIFECYCLE-PARITY-V1` | Stopped by BWC, signal lost, stall, bye on **ops wall** — **PASS** |
| **2** | `COMMAND-WALL-FLV-HANDOFF-V1` | **Command Wall Connecting → Live** — **PASS** |
| **3** | `FR-LIVE-WATCH-FLV-HANDOFF-V1` | FR analytics live tiles — **PASS** |
| **4** | `PANEL-POPOUT-LIVE-FLV-HANDOFF-V1` | Per-panel popout (`/live.html`) — **PASS** |
| **5** | `VIDEO-MATRIX-POPOUT-FLV-LOCAL-ATTACH-V2` | Matrix popout picture — **PASS** |
| **5b** | `POPOUT-CLOSE-SAFE-V1` | Close safe — **PASS** (with 5b-fix) |
| **5b-fix** | `POPOUT-MATRIX-FLV-READY-ACCEPT-V1` | Matrix/live popout FLV — **PASS** |
| **6** | `PIN-FLV-MIRROR-HARDEN-V1` | Map pin FLV mirror — **FAIL layout jump** (picture may OK; see layout disc) |
| **7** | `PIN-FOCUSED-OPEN-V1` | **REJECT** — killed baseline auto-open |
| **7b** | `PIN-BASELINE-OPEN-RESTORE-V1` | Partial — **not enough**; floor still broken |
| **7c** | `PIN-WALL-BASELINE-PLAYER-ONLY-V1` | **FAIL** — pin empty / Open All kk gone |
| **7d** | `PIN-LINK-CLASSIC-PASS-PLAYER-GRAFT-V1` | Linked classic — **FAIL** click pin nothing / jump |
| **7e** | `PIN-CLICK-POPUP-OPEN-NO-DOCK-STORM-V1` | **NEXT** — click→popup; Stop→minimize; one dock (no top jump) |
| **8** | `WALL-AUDIO-PATH-V1` | Listen on wall — **PASS** 2026-07-22 |
| **9** | `CONFERENCE-BWC-INGRESS-WVP-HANDOFF-V1` | **Let BWC into VC room** — WVP/ZLM → RTMP/LiveKit when handoff on (not Fleet pool INVITE) |
| **10** | `PTT-29201-WVP-HOMED-V1` | Soft PTT / Call reliability (`:29201` login when WVP-homed) |
| **11** | `SOS-GROUP-FIELD-RX-RELAY-V1` | **Field PTT mesh** — helper BWC TX → HQ **and** other team BWCs (see §H.1) |
| **12** | `PTT-GROUP-SELECT-1PLUS-V1` | Join 1+ gate — **PASS (gate)**; product still “useless” without mesh talk |
| **12a** | `PTT-GROUP-NET-MESH-AND-TALK-V1` | Real group net: HQ in + BWCs + Group PTT + BWC↔BWC+HQ — **PASS** 2026-07-22 |
| **12b** | `CALL-GROUP-DISPATCH-V1` | Call / discussion group under PTT Groups — **DISC locked** (next) |
| **13** | Panel / polish MOBs | Jul-19 sizing |

### H.2 — Popout Close = dismiss window only (phase 5b)

**Operator rule:** Closing matrix or panel popout is like closing Command Wall — **put away the extra window**, not stop the BWC on the main dashboard.

| Button | Should do |
|--------|-----------|
| **Close** (X) | Kill popout player only; **ops panel + map pin stay live** |
| **Stop ■** in popout | Still stops that cam on the wall (today — unchanged unless you order otherwise) |

**One MOB:** `POPOUT-CLOSE-SAFE-V1` — own popout viewer surface + Close does not `stop-video` the main wall.

### H.3 — PTT mesh (was H.1)

**Yes — SOS team grouping uses the same Fleet path as dispatch Join.**

| Already working (no redo) | Phase 11 adds |
|---------------------------|--------------|
| SOS banner **PTT team** → `pushPttGroupToTeam` (group XML to every cam on team) | On **field** PTT uplink (`handleInboundPttAudio`), fan out PCM to **other** online team members |
| Dispatch **Join** → same `pushPttGroupToTeam` | Same relay when cam is in `activeSosPttTeam` **or** active dispatch group session |
| HQ hold → all team BWCs (`ptt-start` / `sendPttAudioToDevice`) | Does not change — already PASS |

**SOS vs dispatch:** one relay MOB in `server.js` (callback wrapper on inbound PTT). Team list comes from `activeSosPttTeam` (SOS) or last dispatch group push — not two inventions.

**Operator test (phase 8 PASS):** SOS team ON → helper hardware PTT 3s → **kk ear + HQ ear**; HQ hold still → all hear HQ.

**Prerequisite:** Phase 7 (`:29201` stable) — peers need TCP downlink sockets to receive relayed audio.

**Shared code:** `Me8LivePlayerFactory.attachFlvPrimary` + one **`video-stream-ready` handler pattern** — not per-surface inventions (see §H.2).

### H.2 — Resolution-agnostic attach (no per-BWC hardcoding)

**Rule for every UI MOB in phases 2–5 and 6:**

| Do | Do not |
|----|--------|
| Use **`Me8LivePlayerFactory.attachFlvPrimary`** (already `object-fit: contain`) | Hardcode 1920×1080, 704×576, or per-cam geometry |
| Pass **`flvUrl`** from `video-stream-ready` when `wvpVideoHandoff: true` | Assume JSMpeg `ws://…/?camId=` still works |
| Let ZLM FLV carry native BWC encode; CSS scales in slot | Copy Fleet-era fixed canvas sizes per device model |
| Optional later: **`LIVE-HANDOFF-SHARED-ATTACH-V1`** — one small module (`onVideoStreamReady(surface, host, data)`) imported by wall, CW, FR, `live.html`, matrix | Copy-paste attach blocks into six files without shared helper |

**New BWCs:** register on WVP → same `startPlay` / `flvUrl` path. No lab cam list in player code.

**Conference (phase 9)** is different: backend must tee **WVP RTP or ZLM pull** → FFmpeg → LiveKit RTMP ingress — not a browser FLV MOB.

---

## I. What blocked your backlog (honest)

Not “we didn’t do FR/Evidence” — **live video half-migration blocks operator trust**:

- Command Wall FLV applied but **not yet PASS** → blocks multi-monitor / display room testing  
- FR live watch, panel popout, matrix popout still JSMpeg/canvas → blocks FR video + second monitor workflows  
- Conference **let BWC in** dead under handoff → blocks VC + bodycam share  
- Can't PASS pin → blocks map workflow  
- PTT tests blocked by Join 2+ **and** 29201 login **and** field mesh not relayed (phase 11)

Fix phases **1–6** unblock most daily lab video. Phase **9** restores conference BWC. Evidence/FR **non-video** work can continue in parallel.

---

## J. One line

**WVP/ZLM did not delete Fleet — it removed Fleet INVITE for video while ~8 player/lifecycle surfaces still expect JSMpeg canvas.** Consolidated fix = **9 phased MOBs above**, WVP stays, Fleet functions restored, **no park, no rewrite.**
