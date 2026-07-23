# MOB-DISC — Live still dark after HANDOFF-STABLE-V1; backend OK

**Date:** 2026-07-20 ~14:22  
**Status:** DISC only — **no code**  
**Operator:** Live still no picture. Cold SOS still OK.

---

## Verdict (post STABLE-V1)

| Pipe | Status | Evidence |
|------|--------|----------|
| **Cold SOS** | **PASS** | ACL Alarm → `sos-alarm` unchanged |
| **WVP startPlay (backend)** | **PASS** | `wvp video handoff start` · `flvHost:192.168.1.38:18088` · **0** `startPlay fail` in 14:21–14:22 window |
| **Fleet SIP INVITE** | **Correctly skipped** | `invite skipped` `reason:wvp_video_handoff` |
| **Live picture (dashboard)** | **FAIL** | Operator: still dark |
| **PTT / Call** | **FAIL** | Unchanged — separate APPLY |

**5060:** unchanged.

STABLE-V1 fixed the backend storm layer. Picture failure is now almost certainly **UI attach**, not WVP play API.

---

## Log proof (~14:21–14:22, after restart)

```
14:21:58  invite skipped  wvp_video_handoff  …008
14:22:00  wvp video handoff start  …008  flvHost 192.168.1.38:18088
14:22:09  invite skipped  wvp_video_handoff  …009
14:22:11  wvp video handoff start  …009  flvHost 192.168.1.38:18088
14:22:35  soft-stop scheduled  …008 / …009
14:22:39  hard-stop ok  …008 / …009
```

No `video-stream-error`. No `startPlay fail`. Clean stop on operator close.

Contrast with pre-STABLE disc (~14:13): repeated `startPlay fail` under open storm. That layer is **gone**.

---

## Why backend OK but screen dark

Classic-PASS frontend is **frozen**. Server now emits FLV on handoff, but wall logic never uses it directly.

### What server does (working)

`start-video` → skip Fleet INVITE → `wvpVideoHandoff.ensurePlay` → socket:

```js
video-stream-ready { camId, surface, wvpVideoHandoff: true, flvUrl, reused }
```

### What frozen UI does (gap)

`video-stream-ready` handler in `video-wall.js`:

- Adds `camId` to `streamingCams`
- Syncs PTT / SOS reconnect
- **Ignores `flvUrl` and `wvpVideoHandoff`**

Wall attach path:

1. **JSMpeg** on Fleet pool WebSocket (`videoWsUrl`) — no Fleet INVITE → **empty WS, black canvas**
2. After **~2.2s**, `scheduleWallZlmSoftUpgrade` → `fetchDescriptorPreferZlm` → `GET /api/live/playback` → broker reuses handoff FLV
3. `softAttachZlmOverlay` (mpegts) must **prove** play before showing video

### Blockers on step 2–3

| Blocker | Effect |
|---------|--------|
| **Open All / multi-tile** | `wallZlmSoftUpgradeAllowed()` returns **false** when >1 wall cam or Open All slots — **no ZLM overlay at all** |
| **2.2s + 5× retry gap** | Slow; operator may stop before overlay tries |
| **mpegts prove / timeout** | Overlay stays opacity 0 until prove; fail → remove overlay, JSMpeg still black |
| **Pin / map slot** | Soft upgrade only on numeric wall slots — map pin path different |

Broker only logs on **miss**; absence of `live broker wvp handoff miss` does not prove browser called `/api/live/playback`.

---

## Split status (honest, now)

```
SOS:   :5060 Alarm → ACL → sos-alarm              ✅
Live:  start-video → WVP startPlay → FLV :18088   ✅ (backend)
       → classic JSMpeg (empty) + soft FLV overlay ⚠️ often never fires / never proves
PTT:   29201 native HDA                            ❌ (later APPLY)
```

**Backend-only ceiling hit.** Further progress on picture without touching `public/**` is unlikely.

---

## Operator quick check (one cam, not Open All)

1. Hard refresh once  
2. Open **one** roster live (Chin or KK) — **not** Open All  
3. Wait **≥5s** on that tile  
4. If still black → UI attach gap confirmed (backend already OK per log)

---

## Forward (when you APPLY — pick one)

| Name | Scope | Intent |
|------|-------|--------|
| **`MOB-APPLY-BACKEND-VIDEO-UI-FLV-ON-READY-V1`** | **Minimal `public/**`** — user must lift frontend freeze for this item only | On `video-stream-ready`, if `flvUrl` present → skip JSMpeg-first or immediate `softAttachZlmOverlay` |
| **`MOB-APPLY-BACKEND-VIDEO-OPENALL-OVERLAY-V1`** | Same freeze lift | Allow ZLM soft upgrade when Open All / multi-tile (today hard-blocked) |
| PTT native 29201 | Backend | Separate MOB — not mixed with live picture |

**Do not** re-offer classic restore / baseline link unless you ask.

PTT stays **out of scope** until live picture PASS or you explicitly reorder.

---

## One line

HANDOFF-STABLE-V1 **PASS** on WVP play; live still dark because **frozen classic UI never paints handoff FLV** — JSMpeg-first + soft overlay is blocked or too late. Next step needs a **named frontend MOB** or explicit freeze lift for minimal FLV-on-ready.
