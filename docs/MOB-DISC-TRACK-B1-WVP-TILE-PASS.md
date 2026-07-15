# MOB DISC — Track B1 one WVP tile (dashboard) PASS

**Status:** LOCKED — lab PASS 2026-07-14  
**Operator prove:** picture on main dashboard lab tile (silent video OK)  
**Search:** `WVP tile`, `Track B1`, `G.711 mpegts`, `labWvp flv auth`

---

## What passed

One **Lab · WVP one tile** panel on the **main Fleet dashboard** (same login session):

1. Cam on GB / WVP SIP **5061**
2. Play → WVP start → ZLM HTTP-FLV → Fleet `/api/lab/wvp/flv` proxy → mpegts
3. Live picture on dashboard

This is **Track B proof** (fast GB path). It is **not** command-wall / Open All / pool FFmpeg.

---

## Lessons (do not re-learn the hard way)

| Trap | Symptom | Fix (applied) |
|------|---------|----------------|
| Relative FLV URL | Spinner; “playing” badge lied | Absolute URL (`location.origin` + path) — same as `live-player-factory` |
| FLV not on auth allowlist | Spinner / 401; Play API still OK | Public `/api/lab/wvp/flv` when `FM_LAB_WVP=1` (token gate). Mirror ZLM `/api/lab/zlm/flv/` |
| G.711A in FLV | `mpegts error: MediaError CodecUnsupported` | `hasAudio: false` — video is H.264; MSE cannot decode G.711 |
| Separate lab HTML page | Session / JSON.parse fights | Prefer dashboard tile + same cookie |

Upstream stream itself was fine the whole time (real FLV bytes, H.264 High 1280×720). Failures were **browser path**, not “ZLM dead” or “cam not called”.

---

## Env (lab only)

```
FM_LAB_WVP=1
FM_WVP_BASE=http://127.0.0.1:18080
FM_WVP_USER=admin
FM_WVP_PASSWORD=…
FM_WVP_STREAM_HOST=192.168.1.38
FM_LAB_ZLM=0
```

WVP host play port **80** mapped (`mob-wvp-play-host-port-80`).  
Do **not** turn `FM_LAB_ZLM` back on for this proof (wall path stays quiet).

---

## Files (lab)

| Piece | Role |
|-------|------|
| `public/js/wvp-lab-tile.js` | Dashboard tile |
| `public/index.html` | Panel + CSS `body.fm-lab-wvp` |
| `lib/wvpLabClient.js` | WVP API + FLV proxy |
| `lib/dashboardAuth.js` | FLV allowlist when `FM_LAB_WVP=1` |
| `server.js` | `/api/lab/wvp/*`, `labWvp` capability |

APPLIED notes:  
`MOB-APPLIED-TRACK-B1-TILE-ON-DASHBOARD.md` · `MOB-APPLIED-TRACK-B1-FLV-ABSOLUTE-URL.md` · `MOB-APPLIED-TRACK-B1-FLV-AUTH-ALLOW.md` · `MOB-APPLIED-TRACK-B1-FLV-MUTE-G711.md`

---

## Ship (pack time only)

Locked separately: `MOB-DISC-WVP-TILE-NO-SHIP.md`

- Customer env: **no** `FM_LAB_WVP` / `FM_LAB_ZLM`
- Pack strips `test-wvp-tile.html` + `wvp-lab-tile.js`
- Dashboard panel hidden unless lab flag

---

## Forbidden without a new named MOB

- Stuffing this into **command wall / Open All / pool FFmpeg**
- Re-enabling `FM_LAB_ZLM` for desk wall experiments without explicit APPLY
- Assuming “CodecUnsupported” = H.265 (check FLV audio first — often G.711)
- Using **172.x** as stream/server IP

---

## After lab test

Put the test cam back on Fleet SIP **5060** so ops wall works again.

---

## Next direction (talk only)

Scale / many viewers = Track B (WVP+ZLM class path), not more FFmpeg copies. Wall stays Track A until a named MOB to merge.
