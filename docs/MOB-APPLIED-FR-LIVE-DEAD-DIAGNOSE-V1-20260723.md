# MOB APPLIED — FR-LIVE-DEAD-DIAGNOSE-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY FR-LIVE-DEAD-DIAGNOSE-V1`  
**Disc:** `docs/MOB-DISC-LAB-FR-LEFTOVERS-THEN-SECURITY-20260723.md` (Stage L2)  
**Prior:** Stage L1 `FR-ROSTER-PIN-ICON-ASCII-V1` **PASS**

## Verdict (root cause)

**Seeta sidecar is healthy.** FR live tiles can show picture under WVP handoff, but **Recent snaps / matching never run** because the poller still requires the **Fleet mpeg1 pool**, which **handoff never starts**.

| Check | Result |
|-------|--------|
| `GET http://127.0.0.1:8767/health` | `ok:true`, `engine:seeta`, `modelsOk:true` |
| `FM_WVP_VIDEO_HANDOFF=1` | ON (lab) — tiles use FLV |
| `frLivePoller.probeOne` | Gates on `liveStreamPool.isStreamingForCam` → **false** under handoff |
| `frLiveProbe.grabJpeg` | Still pulls **mpeg1 WS** (`ws://…VIDEO_WS_PORT`), not ZLM FLV |
| Silent skip | Previously **no log** when gate failed → looked like “FR totally dead” |

**Not the cause:** roster PIN icon, `faceTrackSidecar` (redact only), Seeta down.

## Code proof

- `lib/frLivePoller.js` — `probeOne` / `grabRepresent*` require `isStreamingForCam`
- `lib/frLiveProbe.js` — `grabJpeg` → Fleet WS + ffmpeg
- `lib/wvpVideoHandoff.js` — already has `getUpstreamFlv` / `getCachedFlv` for server-side pull (wall audio path) — **not wired into FR grab yet**

## What this MOB changed

Rate-limited diagnose log (every 30s/cam) when probe skips:

`fr probe skip: no fleet pool stream` + `wvpHandoff` + hint naming next MOB.

**Does not** restore snaps yet — that is the next APPLY (WVP handoff stays ON).

## Next APPLY (fix)

**`MOB-APPLY FR-LIVE-GRAB-ZLM-HANDOFF-V1`**

When handoff active: grab stills from **ZLM/FLV** (or upstream FLV via `getUpstreamFlv`), and treat “handoff active for cam” as live for the poller gate — **do not** turn `FM_WVP_VIDEO_HANDOFF` off.

Files (planned): `lib/frLiveProbe.js`, `lib/frLivePoller.js`, reuse `lib/wvpVideoHandoff.js`.

## Operator verify (diagnose)

1. Restart Fleet (so new skip log is live).  
2. Analytics → Face → Start watch on a live cam.  
3. Agent/operator: in media log look for `fr probe skip: no fleet pool stream` with `wvpHandoff: true`.  
4. Recent rail still empty until **GRAB-ZLM** APPLY — expected.

**Diagnose PASS** = root cause agreed. Then apply grab MOB.
