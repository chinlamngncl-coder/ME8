# MOB DISC — Consolidated audit fix plan (2026-09-02)

**Sources reconciled**
- `Desktop\axiom_logic_audit.md` — audit run 1 (video/timeline state, alarm schema, offline fallbacks, SOS/DB races)
- `Desktop\axiom_logic_audit 1.md` — audit run 2 (PTT routing, tab teardown, sidecar downloads, fetch timeouts, ledger temp clobber, SIP tag, DB locks)
- Google synthesis (5-MOB backlog) — correct priorities, incomplete coverage

**Status:** paper only. No code changed by this disc. Every item below is one `MOB-APPLY` → restart / refresh → operator PASS → checkpoint → next.

**Restore floor for this campaign:** `me8-firmware-sep-gold-20260902` (`RUN RESTORE-ME8-FIRMWARE-SEP-GOLD`). Older `me8-firmware-gold-20260706` stays as deep fallback.

---

## Reconciliation

- Reports do not contradict; they complete each other. Google's list dropped ~30 High/Med rows and the report-1 Critical compare-layout closure bug.
- Gesture fix is split precisely: real defects are unhandled `play()` promises after fetch and unmuted play in FR dialogs. `tlPlayVideoElement` and `AxiomFlvManager.attach` already do muted-first and are **not** rewritten.
- Locked files shape the plan: `lib/pttServer.js`, `public/js/video-wall.js`, pin-sync functions in `public/index.html` are do-not-touch unless the user names the file. PTT fix lives in `server.js` socket handlers + `lib/pttFieldGroupRelay.js`. `lib/deviceControl.js` `udp_once` untouched. `lib/sipServer.js` does not exist.
- Order principle: server data/audio safety → ship blockers (air gap) → browser stability → schema → DB → hygiene.

---

## Phase 1 — Audio safety and SOS data integrity (server, restart required)

| # | MOB | Files / lines | Change | Crash / regression guard | Operator PASS |
|---|---|---|---|---|---|
| 1 | `PTT-HQ-SINGLE-FLOOR-V1` | `server.js` 16903-17011 (`ptt-start`, `ptt-audio`, `ptt-stop`, `disconnect`); `lib/pttFieldGroupRelay.js` 152-164 | Per-target HQ floor owner (`camId → socketId`). Second `ptt-start` → talk-state "channel busy". `ptt-audio` from non-owner dropped. Release on `ptt-stop`, `disconnect`, and stale timeout (no frames N s). `hqFloors` reference-counted. | Stale timeout mandatory — a crashed browser must never lock a BWC. `pttServer.js` untouched. | Two browsers same cam: A talks, B busy; A releases, B talks. Field→field relay still works. |
| 2 | `PTT-PER-SOCKET-VOICE-TARGET-V1` | `server.js` 14502, 15670, 16882-16901, 16956-16959 | `call-audio` and `ptt-audio` fallback resolve target from socket-local state, never global `pttVoiceCallCamId` / `connectedCameraId`. | Globals stay (many readers); only the two outbound-audio reads change. | Two operators, two calls → audio lands on correct BWC. |
| 3 | `SOS-LEDGER-WRITER-QUEUE-V1` | `lib/sosIncidents.js` 24-54, 371-396, 407-426, 429-451, 484-542 | One promise-chain writer per file; all mutators read→mutate→write inside queue; unique temp (`pid` + random) then rename; ids via `crypto.randomUUID()`; `stampOwningSa` set-if-null in queue. | Per-job `.catch` so one failure cannot poison the chain. `readStore` external API unchanged. | Burst 2 SOS + 2 acks → all rows present, no `.tmp` left, owner = first SA. |
| 4 | `SOS-RAISE-ATOMIC-AND-PER-CAM-ACTIVE-V1` | `lib/deviceAlarm.js` 59-97; `lib/sosIncidents.js` 43-54, 396, 520-528, 1067-1076; `server.js` 13910-13917, 14205-14296 | Serialized open-or-merge per camera; `active-alarm.json` → per-camera map; SOS capture timers per cam; Record arm before send, rollback on send failure. | Merge idempotent; compatibility getter for `readActiveAlarm()` callers. `deviceControl.sendDeviceControl` unchanged. | Fall + SOS same tick → 1 incident; 2 cams SOS → 2 active; one `Record` (`mode:"udp_once"`) on wire. |
| 5 | `SOS-INVITE-GUARDS-V1` | `lib/sosInviteLock.js`; `server.js` ~15134; `lib/liveStreamPool.js` 592-599, 733-739, 773-789; `lib/sosInviteQueue.js` 26-53; `lib/sipCryptoIdentifiers.js` 11-13 | Call `tryAcquire` before first SOS INVITE; `sosServerPull` keeps cooldown bypass but honours `isInviteInFlight`; never overwrite `activeDialog` while one exists; `slotsFree = MAX − active − pending`; From-tag = 8 random bytes hex. | Lock keeps 5 s auto-release (no dead-lock on lost 200 OK). No pin/wall JS touched. | Cold SOS ×3 cams: one INVITE per cam; queue ≤ `MAX_SOS_LIVE`. |

Checkpoint + `lab-git-push-sos` after Phase 1 PASS.

---

## Phase 2 — Air-gap ship blockers

| # | MOB | Files / lines | Change | Guard | PASS |
|---|---|---|---|---|---|
| 6 | `AIRGAP-MAP-OFFLINE-DEFAULT-V1` | `public/js/map-offline-tiles.js`; `vms-command-shell.js` 159-161; `live-popout-minimap.js` 222-225; `ftp-inbox-ui.js` 477-480; `route-trace.js` 198-206; `tactical-shell.js` 665-671; `dashboard-boot.js` 19-30; `index.html` 15190-15201 (map init only); `maplibre-primary.js` | Offline/local first; public tiles only with explicit online opt-in meta; all six surfaces via `MobilityMapTiles`; remove OSM/OpenFreeMap else-branches; blank-tile fallback with message. | Lab without pack shows blank tiles + message, never hangs. `index.html` edit is map-init block only — user names the file. Cache bust touched JS. | Offline PC: maps load instantly, no network errors; opt-in restores OSM. |
| 7 | `AIRGAP-GEOCODE-AND-FETCH-TIMEOUT-V1` | `lib/mapGeocode.js`; `server.js` 2440-2451; `public/js/mobility-map-gis.js`; shared `fetchWithTimeout` for `login.js`, `session-bus.js`, `i18n.js`, `map-offline-tiles.js` | Geocode off unless explicitly enabled; UI hides search when server reports offline; bounded fetches with visible failure state. | Timeouts 8-15 s; `finally` restores controls. | Network unplugged: login and map still respond; search hidden. |
| 8 | `AIRGAP-SIDECAR-NO-DOWNLOAD-V1` | `weapon-sidecar/app.py` 19-21, 75-93; `anpr-sidecar/plate_yolo.py` 30-47, 505-508; `START-ANPR.bat` 51-53; `START-WEAPON.bat` 36-40; `scripts/PACK-SHIP-DELIVERY.ps1` 81-100 | Remove runtime HuggingFace / pip; fail closed with clear log; pack injects offline meta + weights for every SKU. | ANPR fast/heavy paths unchanged; only missing-weights branch changes. | Rename weights → sidecar exits with readable message < 2 s; Fleet stays up. |
| 9 | `AIRGAP-OUTBOUND-LINKS-V1` (Med) | `case-files-ui.js` 184; `lib/sosIncidents.js` 208; `lib/dispatchShare.js` 108; `lib/oidcAuth.js` fetches; `lib/officerNotify.js` defaults | Internal map link / coords; OIDC `AbortSignal.timeout`; Twilio/webhook default off, private-host allowlist. | Copy-only where possible. | No public `https://` in generated SOS HTML. |

---

## Phase 3 — Browser stability (Investigation / Conference / Evidence; cache bust + hard refresh)

| # | MOB | Files / lines | Change | Guard | PASS |
|---|---|---|---|---|---|
| 10 | `INV-TAB-ONHIDE-TEARDOWN-V1` | `vms-investigation-ui.js` 5758-5768, 5195-5205, 5571-5586, 916-923, 1721-1738, 5826; `evidence-manager.js` 470-473; `conference-hub.js` 2058, 2178-2183, 71-93; `map-popout-sync.js` 87-91 | Tab router calls `onHide`; `onHide` = stop master clock, pause/unload tile videos, detach only own FLV sessions, remove document wheel/keydown; cam reassign stops master clock; Conference `onHide` (stop lobby watch, clear toast); popout intervals cleared on `pagehide`. | Idempotent; never touches Ops wall players (`video-wall.js` untouched); `onShow` re-fetches. | Leave Investigation during Sync → CPU drops, no audio; return → clean re-fetch. |
| 11 | `INV-SYNC-SEEK-GENERATION-V1` | `vms-investigation-ui.js` 4087-4119, 3794-3835, 4093-4098, 4738, 5139-5154, 969-984, 4254-4275 | Per-tile seek generation; post-await revalidation (cam/segment/src); `tile.playing` only after seek completes; serialize sync-lock seeks; transport chrome from media events; fix compare-layout `var tile` closure. | Builds on `INV-SYNC-EOF-STOP-YELLOW-V1` (PASS). | Fast scrub + Play All: right video per slot; Pause state true; compare plays 4. |
| 12 | `VMS-PLAY-GESTURE-HYGIENE-V1` | `vms-command-shell.js` 537-578; `vms-investigation-ui.js` 208-238; `fr-alarm.js` 1998-2006; `fr-offline-video.js` 50-57; `vms-playback-ui.js` 295-305; `shared-flv-player.js` 188-198, 304-315; `hq-alert-audio.js` 272-331 | Remove redundant post-fetch `play()`; muted-first for non-gesture plays; readiness-gated FR offline play; catch + "click to play" state; persistent "enable alerts" banner until `unlocked`. | `tlPlayVideoElement` and `AxiomFlvManager.attach` kept. | Fresh console → first SOS tone after one click prompt; FR dialog never silently paused. |
| 13 | `INV-LIVE-REFRESH-AND-CACHE-V1` (Med) | `vms-investigation-ui.js` 3642-3672, 5766-5790, 1604-1618; `evidence-hub.js` 35-45, 540, 1112, 1770-1775, 3680-3688, 3826-3902; `live-player-factory.js` 332-368 | Dirty-flag redraw on alarm socket events; catalog invalidation on dock/FTP events; trim readouts on throttled `timeupdate`; remove FLV listeners in cleanup; tooltip refresh after `tlApplyLayout`. | Throttled; redraw only while visible. | New SOS while day open → red pin without reload. |

Checkpoint + `lab-git-push-investigation` after Phase 3.

---

## Phase 4 — Alarm marker contract

| # | MOB | Files / lines | Change | Guard | PASS |
|---|---|---|---|---|---|
| 14 | `ALARM-MARKER-CONTRACT-V1` | `server.js` 7414-7445, 7573-7592, 13996-14005; `vms-investigation-ui.js` 3645-3671, 3201-3205, 2214-2220, 2889/2898/4637/4645/4760; `lib/vmsAiAlarmIndex.js` 282-290; `lib/deviceAlarm.js` merge path; `lib/vmsAlarmEventPreview.js` 121-127; `lib/vmsForensicExport.js` 65-75 | Writers ISO-UTC only; both queries cast `occurred_at::timestamptz`; timeline sends `tzOffset`; `SELECT cam_id`; drop CHECK-illegal VIP names; single `tlAlarmAt()`; `line_crossing` colour; SOS marker on merge and with `at`; preview/export alias set; calendar errors logged not swallowed. | One-time repair of non-ISO rows before cast is enforced; keep snake_case REST shape in this MOB. | Non-UTC browser: calendar dots and pins agree; SOS pin live; export includes alias markers. |
| 15 | `ALARM-MARKER-SCHEMA-CLEANUP-V1` (Med, discuss first) | `023_vms_spatial_pins.sql`; `020` CHECK; note format; REST/socket mapper | Spatial columns populate-or-drop; `retain_marker` purge rule; structured `note` or remove dead bbox parser; one mapper for `wall-alarm` vs REST. | Product decision, not bug fix. | — |

---

## Phase 5 — DB and store races

| # | MOB | Files / lines | Change | Guard | PASS |
|---|---|---|---|---|---|
| 16 | `DB-UNIQUENESS-AND-LOCKS-V1` | `lib/siteDb.js` 1327-1349, 1433-1454, 486-504; `lib/evidenceRegistry.js` 260-295; new migration | `SELECT … FOR UPDATE` for exhibit numbering; column-scoped `UPDATE` for case file; `UNIQUE(relative_path)` + `ON CONFLICT (relative_path)`. | Migration dedupes existing duplicate `relative_path` rows first. | Two browsers add exhibits at once → #1 and #2, no 500. |
| 17 | `JSON-STORE-SINGLE-WRITER-V1` | `lib/wvpSipLanMap.js`; `lib/dispatchGroups.js`; `lib/conferenceStore.js`; `lib/pttServer.js` 83-99 (temp+rename only — user names file); `lib/pttEvidenceRecorder.js` 107-162; `server.js` 13839-13898 | Reuse MOB 3 writer-queue helper; atomic temp+rename; per-key finalize queue; FTP snapshot check-and-claim atomic. | Shared helper, identical behaviour across stores. | 8 BWC re-register burst → LAN map keeps all peers. |
| 18 | `PTT-AUDIO-FOCUS-AND-TEAMS-V1` (Med, discuss first) | `lib/liveStreamPool.js` 39, 144-217; `lib/pttFieldGroupRelay.js` 139-249; `lib/sipGroupCall.js` 258-296; `server.js` 18131-18177 | Per-viewer audio focus or multiplexed frames; per-target TX lock across SOS teams; group-call mix policy; alarm NOTIFY camId from SIP peer. | Group-call mixing is by design — product decision first. | — |

---

## Rules of engagement (every MOB)

1. User types exact `MOB-APPLY <name>`; agent patches only listed lines; no bundling.
2. Server MOB → `RESTART-FLEET.bat`. UI MOB → agent bumps `?v=` in `index.html`, user hard-refreshes once.
3. PASS → disc line recorded → checkpoint. Genre push only on `lab-git-push-<genre>`.
4. FAIL on Phase 1 or 3 with pin/wall regression → user types `RUN RESTORE-ME8-FIRMWARE-SEP-GOLD`; otherwise agent reverts that single MOB.
5. Locked files touched only where the table says "user names file".

**First command:** `MOB-APPLY PTT-HQ-SINGLE-FLOOR-V1`
