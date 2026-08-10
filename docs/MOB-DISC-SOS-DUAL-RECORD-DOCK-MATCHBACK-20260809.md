# MOB DISC — SOS dual recording + dock match-back (2026-08-09)

**Status:** Path B + dock watch + matchback + **dual media UI** APPLIED (2026-08-09). Serial registry still parked.  
**Question:** When SOS is pressed, can we always get ground truth even if HQ live dies — and later, when the officer docks, link that upload to the same SOS?  
**Answer:** **Yes.** That is the correct enterprise shape. ME8 already has **half** of it.

---

## 1. Why one video is not enough

| Reality | Risk |
|---------|------|
| SOS pressed outdoors | RF / live may drop anytime — **cannot assume signal forever** |
| HQ only records the live stream | If stream dies mid-incident → **partial or empty HQ file** |
| Device keeps writing to SD | Survives radio loss; arrives later via **dock / FTP** |

Industry body-worn pattern (Axis / similar BWC ecosystems): live stream when possible; **on-device record** continues; **dock offload** is the reliable evidence path. We align to that — not invent a fantasy.

---

## 2. What ME8 already has (Path A — HQ)

Today, when SOS pulls live and decode starts:

- Setting: Evidence → **`liveCaptureEnabled` + `liveCaptureAutoOnSos`**
- Code: `liveCapture.startForSos(camId)` (server.js on stream-ready)
- Result: server MP4 from the **HQ live path**, linked into SOS ledger via `attachServerRecording` → `serverRecordingEvidenceId`

**Limit:** This **dies with the live stream**. Path A alone is not enough for your scenario.

**Done (2026-08-09):** On **new** SOS/fall raise → one DeviceControl `Record` (`udp_once`) + ledger `deviceRecordCmdAt` / `deviceRecordCmdOk` / `deviceRecordCmdReason`. Merge of open alarm does **not** re-send.

---

## 3. What we will add (locked)

### Path B — On SOS: remote **device** record (ground)

**Every SOS raise** (when SIP can still reach the BWC), Fleet sends **one** DeviceControl **`Record`** (`udp_once`, same as Snapshot/Record rules — no storm).

| Fact | Lock |
|------|------|
| Trigger | SOS alarm raise (same moment as ledger open + toast) |
| Command | DeviceControl `Record` (A/V on camera SD — not a second invented audio-only protocol unless firmware proves one) |
| Why | Continues on the **belt** after HQ RF dies |
| If SIP already dead | Command may fail — still keep Path A if any live existed; still rely on **dock** if camera was already recording / firmware auto-records on SOS |
| Stop | Policy later: Ack / max duration / `StopRecord` — **not** in first APPLY; first APPLY = **start on SOS** + ledger flag |

Ledger fields (concept):

- `deviceRecordCmdAt` / `deviceRecordCmdOk` (attempt + result)
- Later: `deviceRecordingEvidenceId` when dock file is linked

**Two videos when both succeed:**

1. **HQ** — `serverRecording*` (may be short / missing)  
2. **Ground** — dock-ingested clip linked as device recording for that SOS  

Both sit on the **same SOS incident / future SO- case**.

### Path C — On dock: search SOS and link

When dock/FTP ingest registers a new file for `cameraId`:

1. Look up SOS ledger alarms for that **device** (and operator if known) in a **time window** around SOS `at` (e.g. file start within SOS±N minutes, or file covers SOS timestamp).  
2. Prefer **open / unacked** SOS first, then most recent matching SOS that day.  
3. Attach evidence id → SOS (and later Ops Case `SO-…`).  
4. UI: SOS detail / Cases shows **HQ clip** + **Ground clip** (missing either is OK; never hide the SOS).

**Not** FTP hand-edit. **Not** “operator guesses which folder.” Server match-back only.

---

## 4. Logic check (no contradiction with Ops Cases)

| Topic | Lock |
|-------|------|
| Ops Cases SOS | Case still **links** existing SOS ledger — dual media hang off that ledger/case |
| Toast | Still alarm only — not the video office |
| DeviceControl | Remains **`udp_once`** — one SOS → one Record MESSAGE |
| Live Capture Auto on SOS | **Keep** — Path A stays; Path B is additive |
| Signal forever? | **No** — design assumes RF can die; Path B + dock are the safety net |

---

## 5. Can we do “software trigger remote recording every SOS?”

**Yes — Path B.** That is exactly DeviceControl `Record` on SOS raise.

Caveats (honest, not optional marketing):

1. Needs **SIP reachability at press time** (or shortly after). Dead radio = command may not land; dock still matters.  
2. Some firmwares already start local record on SOS hardware — Path B then is “ensure + log”; may be duplicate start — still OK if device ignores second Record. Lab must verify on our BWCs.  
3. Audio-only remote without video is **not** the first design — device Record is A/V; HQ live may include listen audio separately.

---

## 6. Build order (one APPLY at a time)

| # | APPLY | Delivers |
|---|-------|----------|
| **1** | `SOS-DEVICE-RECORD-ON-ALARM-V1` | On SOS raise → one DeviceControl `Record` + ledger attempt flags |
| **2** | `SOS-DOCK-MATCHBACK-V1` | Dock/FTP ingest → find SOS by device/time → attach ground evidence |
| **3** | `SOS-DUAL-MEDIA-UI-V1` | SOS detail / Cases: show HQ + Ground (or “missing”) |

Ops Case store can consume the same links when `OPS-CASE-SOS-WIRE-V1` lands — no second SOS DB.

---

## 7. Recommendation (locked)

**Do dual path.** Do not opt out of dock match-back. Do not rely on HQ live alone.

**Next APPLY when you want code:** `MOB-APPLY SOS-DEVICE-RECORD-ON-ALARM-V1`
