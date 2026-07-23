# MOB DISC — What path are we on now: WVP+ZLM or Fleet FFmpeg? (2026-07-19 02:45)

**Status:** DISC check only · no APPLY  
**Search:** engine zlm, wvp-zlm, invite 408, primary pipeline

---

## Verdict

**Primary live picture = WVP → ZLM FLV (mpegts on Ops wall).**  
**Not** Fleet classic FFmpeg / JSMpeg pool as the working picture path.

Fleet FFmpeg INVITE still exists as a **fallback code path** and can still fire (and **408**) if ZLM mount fails or an old UI path calls `ensureInvite` — but the broker and wall primary are WVP/ZLM.

---

## Proof (lab now)

| Check | Result |
|-------|--------|
| `FM_LAB_WVP` | `1` |
| SIP proxy | `WVP_SIP_PROXY_LISTEN=0` (WVP owns `:5060`) |
| Broker `getDescriptor(…0008)` | `engine: "zlm"`, `source: "wvp-zlm"`, FLV `http://192.168.1.38:18088/rtp/…` |
| Broker `getDescriptor(…0009)` | same — **zlm / wvp-zlm** |
| Wall script | `video-wall.js?v=20260719-pin-stop-res` → `mountWallZlmPrimary` first |
| Player | `softAttachZlmOverlay` → **mpegts.js** on FLV |
| Fleet INVITE | Still seen **`invite failed status:408`** at 02:44:43 — fallback / side path, **not** the successful picture |

---

## Split brain (what each system owns)

| Concern | Path now |
|---------|----------|
| Cam REGISTER / Platform Connected | **WVP** `:5060` |
| Ops green dots | WVP API presence (`FM_WVP_FLEET_PRESENCE=1`) |
| Wall live picture | **WVP startPlay → ZLM `:18088` FLV → mpegts** |
| Pin live | Mirror from wall **`<video>`** (after pin-stop-res) — still WVP/ZLM pixels, not Fleet |
| Fleet `:5062` / FFmpeg / JSMpeg | Fallback only; cams not on Fleet → INVITE **408** if attempted |
| SOS / PTT / classic YDT | Still Fleet-side systems (unchanged cores) |

---

## One line

**We are on WVP+ZLM for Ops wall video.** Fleet classic FFmpeg is not what lights the panel when primary works; it only appears when something falls back and then dies with 408.
