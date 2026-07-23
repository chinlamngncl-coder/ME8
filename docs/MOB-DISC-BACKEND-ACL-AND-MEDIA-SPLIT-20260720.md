# MOB-DISC — Backend ACL + media split (frontend frozen)

**Name:** `MOB-EXECUTE-BACKEND-ACL-AND-MEDIA-SPLIT`  
**Date:** 2026-07-20  
**Status:** DISC only — **no code** until named APPLY  
**Context:** Classic-PASS frontend restore **done**. Google plan = backend-only split brain.

---

## Confirmed — frontend frozen

| Rule | Commitment |
|------|------------|
| Classic dashboard UI | **Frozen** after classic-PASS restore |
| `public/**` (incl. `video-wall.js`, `index.html`, sockets client) | **Do not modify** to fit WVP shapes |
| No React/Vue rewiring | ME8 Ops is vanilla JS — same freeze: **no UI component logic for WVP** |
| Frontend must not “know” WVP | Only classic Socket.IO events + classic player URL fields |

Phase 2 / this EXECUTE = **UbitronC2 Node backend only.**  
UI stays pristine; translator + pipes adapt **behind** it.

---

## Architecture (three pipes)

```
                    ┌─────────────────────────────────────┐
  Telemetry/SOS     │  ACL translator (WVP → Fleet JSON)  │──► classic sockets
  (WVP / proxy) ──► │  DevStatus / Battery / Alarm →      │    heartbeat,
                    │  device-status / sos-alarm / …      │    device-status, …
                    └─────────────────────────────────────┘

  Soft PTT/Call ──► Fleet sockets ──► TCP :29201 HDA (gtid 49)   [NO WVP audio]

  Live / FR popup ─► Fleet intercept ──► WVP startPlay ──► FLV URL ──► classic player
```

| Pipe | Owner | Forbidden |
|------|-------|-----------|
| **Data / SOS / status** | Backend ACL → classic Socket.IO names | Changing UI event handlers |
| **Audio PTT/Call** | Fleet native **29201** | WVP `/play/broadcast`, VoiceAdapter uplink |
| **Video** | WVP/ZLM via Fleet handoff | Teaching UI new WVP APIs |

---

## STEP 1 — Anti-corruption layer (data translator)

**Job:** WVP/GB events → **exact** legacy Fleet JSON + **classic** Socket.IO names.

### Node files to touch (backend only)

| File | Role |
|------|------|
| **`lib/wvpFleetAclTranslator.js`** *(new)* | Single ACL: GB/WVP payload → classic shapes (`cameraId`, battery, online, GPS fields, …) |
| **`lib/wvpEventBus.js`** | Extend ingest: `DevStatus` / status / battery (not only Alarm / ptt-rx) → call translator → existing Fleet emitters |
| **`lib/wvpWebhooks.js`** | Keep/align HTTP webhook entry if used; no new dashboard JWT path |
| **`lib/wvpGb28181Bridge.js`** | Socket event **name** constants already classic (`sos-alarm`, `ptt-rx-state`, …) — reuse, do not invent UI events |
| **`scripts/wvp-sip-lan-proxy.js`** | Only if MESSAGE XML (`DevStatus` / `Battery`) must be published onto event bus — **proxy publish**, not UI |
| **`server.js`** | Mount/wire ACL deps only: pass `raiseDeviceAlarm`, `emitToDashboardSockets` / `device-status` / `heartbeat` / GPS helpers — **no** `public/` edits |
| **`lib/telemetryFromXml.js`** | Reuse classic battery/XML parsers where shapes match |
| **`lib/deviceAlarm.js`** | Unchanged gold SOS brain — translator **calls** it, does not replace UI |

**Emit targets (classic names the frozen UI already listens for):**  
e.g. `sos-alarm`, `device-status`, `heartbeat`, `gps-update`, (and existing PTT RX names if needed) — **same payloads as classic Fleet**.

---

## STEP 2 — Native PTT audio pipe (29201)

**Job:** Classic UI sockets → Fleet → **gtid 49 / port 29201** — **bypass WVP for all talk**.

### Node files (restore / guard — not UI)

| File | Role |
|------|------|
| **`lib/pttServer.js`** | TCP listen **29201**, HDA login/audio — keep classic |
| **`server.js`** | `ptt-wake-device` / `ptt-start` / `ptt-audio` / `ptt-stop` / `start-bwc-call` / `call-audio`; **`pushPttGroupForCamera`** (`gtid` + `port: 29201`) |
| **`lib/ptt*` / roster helpers** as already used by classic | Group XML / fleet roster for MESSAGE |

**Explicitly do not route talk through:**  
`lib/wvpFleetVoiceAdapter.js`, `lib/wvpVoiceUplink.js`, WVP `/api/play/broadcast` (may remain on disk idle; **not** on product path).

**Note after classic-PASS restore:** Step 2 is largely **already** the live PTT path in restored `server.js` / `pttServer.js`. Later APPLYs for Step 1/3 must **not** re-lobotomize 29201.

---

## STEP 3 — Video pipe → WVP/ZLM

**Job:** Classic UI still emits classic live requests (e.g. `start-video`). Backend intercepts → WVP REST `startPlay` → return **standard stream URL** the classic player already understands (FLV / existing URL field) — UI unchanged.

### Node files

| File | Role |
|------|------|
| **`lib/wvpLabClient.js`** | `startPlay` / `stopPlay` / FLV URL normalize (LAN host, not 172.x) |
| **`server.js`** | Intercept live start/stop / Soft-Open-style skip of Fleet video INVITE for WVP-homed cams; hand FLV URL into **existing** media session / viewer path the classic UI already consumes |
| **`lib/livePlaybackBroker.js`** *(if still in tree and on path)* | Only if classic live broker must accept WVP URL without UI change |
| **`lib/liveStreamPool.js` / dashboard video helpers** | Stop/ref-count; call WVP stop when classic stop — still backend |

**Forbidden:** editing `public/js/video-wall.js`, `live-player-factory.js`, or teaching the browser to call `:18080` directly.

---

## What we will **not** do

- Any `public/**` change for WVP data shapes  
- WVP audio / broadcast as PTT  
- “Go back” second classic restore unless you order it  
- Bundling Step 1+2+3 in one silent freestyle — **one named APPLY at a time** when you say so  

---

## Apply shape (when you order — not now)

Suggested names (pick one first):

1. **`MOB-APPLY-BACKEND-ACL-TRANSLATOR-V1`** — Step 1 only  
2. **`MOB-APPLY-BACKEND-VIDEO-WVP-HANDOFF-V1`** — Step 3 only (PTT already classic)  
3. Step 2 = **verify/guard only** unless a regression reintroduces VoiceAdapter  

---

## One-line confirm

**Frontend frozen. Backend ACL translator + 29201 audio + WVP video handoff — files listed above; no UI surgery.**
