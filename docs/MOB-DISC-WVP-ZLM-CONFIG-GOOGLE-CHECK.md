# MOB DISC — Google ZLM “keep-alive / latency” advice vs our desk (check only)

**Status:** talk only — **no config APPLY yet**  
**Date:** 2026-07-14  
**Trigger:** Tile B stop–reopen soak + operator pasted Google advice  
**Log proof:** `docs/MOB-LOG-WVP-TILE-SOAK-2026-07-14.md`  
**Search:** `modify_stamp`, `lowLatency`, `streamNoneReader`, Google ZLM BWC

---

## First: what the soak log already proved

Do **not** assume B was “still fine.”

From `me8-wvp` logs:

- **chin `…0008`** FLV player died ~**3.8 min**, came back (`on_play`), died ~**6 min**, came back, later died again  
- **kk `…0009`** held ~**48 min** then stop/none-reader  
- Continuous **stamp expired** warnings + some **rtp丢包**

So: **B stop + call-back = reopen covering real player drops.**  
Latency feeling OK does **not** mean stability PASS.

**Scale honesty (2026-07-14):** 2-tile lab ≠ thousands of BWCs. Proper path locked: `docs/MOB-DISC-WVP-PROPER-SCALE-NOT-TWO-CAMS.md`. Bundled ZLM config **found**: `me8-wvp` → `/opt/media/config.ini`.

**Correction (same day):** Google was **not** wrong — we are on a **2021** all-in-one (`648540858/wvp_pro`), not current ZLM. Full admission: `docs/MOB-DISC-WVP-NOT-ON-LATEST-ZLM.md`. Apply modern knobs only after **modern split** upgrade.

---

## Critical lab fact (before touching any ini)

Track B WVP tiles use **`me8-wvp` bundled ZLM** (ports **80 / 18088**), **not** Fleet `me8-zlm` (`docker/zlm.compose.yml` + `docker/zlm-config/config.ini`).

| Stack | Role |
|-------|------|
| `me8-wvp` bundled ZLM | **This** two-tile / GB scale lab |
| `me8-zlm` + `docker/zlm-config/config.ini` | Fleet wall / older Gate B path — **different** process |

Any APPLY that only edits `docker/zlm-config/config.ini` **will not fix Tile B** unless we also change/mount the **WVP image’s** ZLM config. Agent must find where bundled ZLM config lives inside `me8-wvp` before APPLY.

---

## Our current `docker/zlm-config/config.ini` (Fleet ZLM — reference)

Facts today (not assumed Google names):

| Key | Today | Notes |
|-----|-------|--------|
| `mergeWriteMS` | **0** | Already matches Google “instant” |
| `maxStreamWaitMS` | **15000** | Google’s “1000” is aggressive — can cause more resets |
| `streamNoneReaderDelayMS` | **20000** | Delay before none-reader close |
| `continue_push_ms` | **15000** | Push reconnect grace |
| `modify_stamp` | **2** | Google wants **1** — needs version doc check |
| `lowLatency` (rtp/rtsp) | **0** | Google wants **1** |
| `rtp_proxy.timeoutSec` | **15** | Already 15 |
| `http.keepAliveSecond` | **15** | Player HTTP idle |

**Not present as Google typed them** (do not invent into ini blindly):

- `stream_none_reader_keepalive`  
- `rtp_rtcp_timeoutSec` / `check_rtp_rtcp_timeout`  
- `enable_drop_frame`  

Those may be wrong names, old forks, or mistranslations. **Reject APPLY until key exists in this ZLM build’s docs/default.ini.**

---

## Google advice — triage (agree / caution / reject)

### Likely useful (align with log: stamp + choppy cam)

| Google idea | Our map | Caution |
|-------------|---------|---------|
| Fix stamp / creeping delay | Try `modify_stamp=1` (today **2**) on **WVP bundled** ZLM | Measure soak after; stamp warnings already flood logs |
| Low latency RTP | `lowLatency=1` under `[rtp]` / `[rtsp]` | Can increase visible glitch; trade vs delay |
| `mergeWriteMS=0` | **Already 0** | No change |

### Partial / rename Google words

| Google | Reality here |
|--------|----------------|
| `stream_none_reader_keepalive = 1` | We have `streamNoneReaderDelayMS` + hooks; “keepalive=1” not in our file. Goal = don’t tear media the second a player blinks — already somewhat covered by `continue_push_ms` / delay MS — tune carefully |
| `rtp_rtcp_timeoutSec = 15` | Closest: `rtp_proxy.timeoutSec=15` **already** |
| `max_stream_wait_ms = 1000` | Ours `maxStreamWaitMS=15000`. **Do not** slam to 1000 without proof — can **increase** “stop and err” |

### Risky / do not APPLY without proof

| Google | Why |
|--------|-----|
| `enable_drop_frame = 1` | Key may not exist; B-frame drop assumption may not match GB H.264 from BWC |
| “Only way to kill latency is drop frames” | Overclaim. Our latency already felt OK; problem now is **drop/reopen**, not primarily lag |
| Blame SIP Register every minute | Soak log for this evening is **player disconnect / stamp / rtp丢包**, not a SIP Register loop every minute in the extract. Keep Register check as **optional** if cams re-auth in WVP UI |

### Network / cam (agent note — you don’t measure for client)

rtp丢包 + stamp expired while chin dies more than kk → **chin path / radio / bitrate** can be weaker. Lower BWC bitrate is a **real** option later — **not** operator homework tonight; agent documents if APPLY needs cam menu.

---

## Root direction vs patch (locked honesty)

| Layer | Status |
|-------|--------|
| Auto-reopen | **Patch** — explains “came back”; not stable |
| ws-flv player | Applied — still saw chin drop in soak → **not enough alone** |
| ZLM stamp / lowLatency on **WVP bundled** config | **Next root candidate** (desk MOB) |
| Fleet `zlm-config` alone | **Wrong target** for this tile test unless remounted into WVP |

---

## Proposed next MOB names (talk — no apply)

1. **`mob-wvp-bundled-zlm-find-config`** — locate + document where `me8-wvp` ZLM ini lives / how to persist  
2. **`mob-wvp-zlm-stamp-lowlatency`** — only after (1): set `modify_stamp=1`, `lowLatency=1` on **that** config; soak A+B **30+ min**; PASS = B does not need reopen every few minutes  
3. **Do not** APPLY Google’s full laundry list in one shot  

Operator: PASS/FAIL from picture only. Agent owns logs + config.

---

## Forbidden

- Blind paste Google keys that are not in ZLM  
- Editing Fleet `zlm-config` and claiming Tile B fixed  
- Calling reopen “stable”  
- Asking you to time with phone / put OSD / write client measure docs  
- `liveBufferLatencyChasing` again  

---

## Related

- Soak log: `docs/MOB-LOG-WVP-TILE-SOAK-2026-07-14.md`  
- Reopen patch: `docs/MOB-DISC-WVP-REOPEN-IS-PATCH-NOT-STABLE.md`  
- Latency handover: `docs/MOB-DISC-ZLM-LATENCY-HANDOVER.md`
