# MOB-DISC — Google handoff: backend ACL + media split (status so far)

**Date:** 2026-07-20  
**Audience:** Google (original plan author)  
**Status:** DISC only — **no new code** in this doc  
**Operator ask:** Review what ME8 executed against your suggestion before next APPLY.

---

## 1. Your suggestion (what we committed to)

From Google plan / `MOB-EXECUTE-BACKEND-ACL-AND-MEDIA-SPLIT`:

| Rule | Commitment |
|------|------------|
| **Frontend frozen** | Classic-PASS dashboard restored; **no** `public/**` edits to teach UI WVP shapes |
| **Three pipes** | (1) ACL translator for SOS/status, (2) native Fleet PTT **29201**, (3) WVP/ZLM video handoff behind classic `start-video` |
| **5060 unchanged** | GB SIP door stays host `:5060` → proxy → WVP |
| **No WVP audio for PTT** | Talk = Fleet TCP HDA, not WVP broadcast |
| **Backend only** | Node translator + interceptors adapt behind frozen UI |

We followed that shape. One named APPLY at a time.

---

## 2. Timeline — what was done (2026-07-20)

### Phase 0 — Baseline reset (before split)

| Step | APPLY / action | Result |
|------|----------------|--------|
| Classic restore | `RESTORE-ME8-CLASSIC-PASS-20260718.ps1` | **2510 files** restored, VERIFY OK |
| Env after restore | `FM_LAB_WVP=0`, `FM_SOFTOPEN_WVP_ONLY=0`, `FM_WVP_FLEET_PRESENCE=0` | Classic Jul-18 feel |
| VoiceAdapter detour (rejected) | `MOB-APPLY-FLEET-VOICE-ADAPTER-WVP-V1` + uplink | Partial ear once; operator rejected WVP audio path |
| ARCH cancel | `MOB-ARCH-CANCEL-VOICE-LOBOTOMY-RESTORE-NATIVE-PTT` | Restored Fleet native 29201 emit; **no cam TCP login** → soft PTT dead |

### Phase 1 — Step 1: ACL translator ✅ PASS

**APPLY:** `MOB-APPLY-BACKEND-ACL-TRANSLATOR-V1`

| File | Change |
|------|--------|
| `lib/wvpFleetAclTranslator.js` | **New** — WVP/GB → classic JSON shapes |
| `lib/wvpEventBus.js` | Ingest Alarm / DevStatus / REGISTER → classic emits |
| `server.js` | Mount `/api/lab/wvp/events` **before** JWT |
| `scripts/wvp-sip-lan-proxy.js` | Publish MESSAGE Alarm/DevStatus + REGISTER to event bus |

**Operator result:** **Cold SOS PASS** — Alarm on `:5060` → ACL → classic `sos-alarm`.  
**5060:** unchanged.

Doc: `docs/MOB-APPLIED-BACKEND-ACL-TRANSLATOR-V1-20260720.md`

---

### Phase 2 — Step 3: Video WVP handoff ✅ backend / ❌ picture

**APPLY:** `MOB-APPLY-BACKEND-VIDEO-WVP-HANDOFF-V1`

| Piece | Behavior |
|-------|----------|
| `FM_WVP_VIDEO_HANDOFF=1` | On (`FM_LAB_WVP` stays **0**) |
| `lib/wvpVideoHandoff.js` | **New** — WVP `startPlay` / `stopPlay`, session ref-count |
| `lib/livePlaybackBroker.js` | Prefer handoff → `engine: zlm` + `flvUrl` |
| `lib/wvpLabClient.js` | `isEnabled` when handoff flag on; FLV host rewrite |
| `server.js` | `start-video` → **skip Fleet SIP INVITE** → handoff → `video-stream-ready` with `flvUrl` |

**First operator result:** Live still dark; many `startPlay fail` under open storm.

Doc: `docs/MOB-APPLIED-BACKEND-VIDEO-WVP-HANDOFF-V1-20260720.md`

---

**APPLY:** `MOB-APPLY-BACKEND-VIDEO-HANDOFF-STABLE-V1`

| Fix | Detail |
|-----|--------|
| Per-cam serialize + 500ms global gap | Stops Open All / dual `startPlay` storm |
| Soft-stop 4s grace | Reuse FLV session on quick re-open |
| ssrc / play fail | Hard stop + one retry after 900ms |
| FLV port | `FM_WVP_ZLM_HTTP_PORT=18088` (not bare `:80`) |
| WVP error text | UTF-8 decode + sanitize |

**Second operator result:** Backend **PASS** on play; **picture still FAIL** on dashboard.

Doc: `docs/MOB-APPLIED-BACKEND-VIDEO-HANDOFF-STABLE-V1-20260720.md`

---

### Phase 3 — Step 2: Native PTT 29201 ⚠️ not broken by split / still dead

**No new APPLY** — classic `pttServer.js` + `server.js` paths restored after VoiceAdapter cancel.

| Signal | Status |
|--------|--------|
| Fleet `PTT listening` `:29201` | Yes |
| `group config sent` gtid **49** port **29201** | Yes (flood on wake) |
| `client connected` / `login ok` on 29201 | **None** |
| Soft PTT / Call on desk | **FAIL** |

**Likely cause:** cams SIP-home on WVP `:5060`; Fleet MESSAGE sent but cam never opens TCP 29201.

Doc: `docs/MOB-DISC-NATIVE-29201-RESTORED-STILL-DEAD-20260720.md`

---

## 3. Current status (one screen)

| Pipe | Status | Notes |
|------|--------|-------|
| **Cold SOS** | **✅ PASS** | ACL Step 1 — `:5060` Alarm → `sos-alarm` |
| **Device status / heartbeat** | **✅ PASS** | ACL presence / DevStatus → classic sockets |
| **WVP `startPlay` (backend)** | **✅ PASS** (post STABLE) | FLV `192.168.1.38:18088`, no `startPlay fail` in clean run |
| **Live picture (dashboard)** | **❌ FAIL** | Backend emits FLV; frozen UI does not paint it |
| **PTT / Call** | **❌ FAIL** | No 29201 login; separate problem from video |
| **Frontend** | **Frozen** | Classic-PASS — intentional per plan |
| **5060** | **Unchanged** | Host proxy → WVP |

---

## 4. Architecture as built

```
                    ┌─────────────────────────────────────┐
  BWC Alarm/SOS     │  wvpFleetAclTranslator            │
  :5060 MESSAGE  ──►│  wvpEventBus + sip-lan-proxy        │──► sos-alarm ✅
                    │                                     │    device-status ✅
                    └─────────────────────────────────────┘

  UI start-video    │  server.js intercept                │
  (classic socket) ─►│  skip Fleet INVITE                 │──► WVP startPlay ✅
                    │  wvpVideoHandoff                    │──► flvUrl :18088 ✅
                    └─────────────────────────────────────┘
                              │
                              ▼
                    Frozen classic UI:
                    JSMpeg on empty Fleet WS (black)
                    → 2.2s later soft ZLM overlay via /api/live/playback
                    → blocked for Open All / multi-tile
                    → ignores flvUrl on video-stream-ready  ❌ picture

  UI PTT / Call     │  Fleet group MESSAGE + 29201 HDA    │
                    └─────────────────────────────────────┘
                              │
                              ▼
                    group config sent ✅ · login ok ❌  → soft PTT dead
```

---

## 5. Log proof (operator live try ~14:21–14:22, post STABLE)

```
invite skipped  reason:wvp_video_handoff  camId:34020000001329000008
wvp video handoff start  camId:…008  flvHost:192.168.1.38:18088  path:backend-video-handoff-stable-v1
invite skipped  reason:wvp_video_handoff  camId:34020000001329000009
wvp video handoff start  camId:…009  flvHost:192.168.1.38:18088
wvp video handoff soft-stop scheduled  graceMs:4000
wvp video handoff hard-stop  ok:true
```

- **No** `startPlay fail`
- **No** `video-stream-error`
- **No** Fleet SIP 408 (INVITE correctly skipped)

Contrast pre-STABLE (~14:13): repeated `startPlay fail` under dual-open storm — **fixed by STABLE-V1**.

---

## 6. Why live picture still dark (Google review point)

Backend does what the plan asked:

```js
// server.js — on handoff success
requestSocket.emit('video-stream-ready', {
  camId, surface,
  wvpVideoHandoff: true,
  flvUrl: out.flvUrl,
  reused: !!out.reused,
});
```

Frozen classic UI (`public/js/video-wall.js`) on `video-stream-ready`:

- Adds `camId` to `streamingCams`
- Syncs PTT / SOS reconnect
- **Does not read `flvUrl`**

Wall attach path instead:

1. **JSMpeg** on Fleet pool WebSocket — no Fleet INVITE → **empty stream, black**
2. After **~2.2s**, `scheduleWallZlmSoftUpgrade` → `GET /api/live/playback` → `softAttachZlmOverlay` (mpegts)
3. `wallZlmSoftUpgradeAllowed()` returns **false** for Open All / multi-tile — **no overlay**

**Conclusion:** Backend-only Step 3 hit a ceiling. Plan assumed classic player would consume handoff FLV without UI change; frozen UI’s JSMpeg-first + delayed soft overlay does not reliably paint WVP FLV.

Docs:  
- `docs/MOB-DISC-LIVE-STILL-DARK-AFTER-HANDOFF-20260720.md` (pre-STABLE)  
- `docs/MOB-DISC-LIVE-STILL-DARK-AFTER-HANDOFF-STABLE-20260720.md` (post-STABLE)

---

## 7. Env flags (current lab)

| Flag | Value | Meaning |
|------|-------|---------|
| `FM_LAB_WVP` | **0** | Classic lab WVP UI path off |
| `FM_SOFTOPEN_WVP_ONLY` | **0** | Soft Open storm path off |
| `FM_WVP_FLEET_PRESENCE` | **0** | Fake Fleet presence off |
| `FM_WVP_VIDEO_HANDOFF` | **1** | Step 3 backend handoff **on** |
| `FM_WVP_ZLM_HTTP_PORT` | **18088** | FLV browser URL port |

---

## 8. Lab ports / platform (unchanged SIP door)

| Item | Value |
|------|--------|
| Dashboard | `http://192.168.1.38:3988` |
| GB / WVP SIP (cams) | **`192.168.1.38:5060`** — **unchanged** |
| Proxy target | `127.0.0.1:15061` (Docker WVP) |
| WVP platform | domain `4401020049` · ID `44010200492000000001` · pwd `admin123` |
| WVP UI | `:18080` |
| ZLM HTTP-FLV | `:18088` |
| Fleet SIP (classic) | `:5062` · platform `34020000002000000001` |
| PTT TCP | `:29201` · gtid **49** |
| ACL event bus | `POST http://127.0.0.1:3988/api/lab/wvp/events` |

---

## 9. Files touched (backend split only)

| File | Step |
|------|------|
| `lib/wvpFleetAclTranslator.js` | 1 — new |
| `lib/wvpEventBus.js` | 1 |
| `lib/wvpVideoHandoff.js` | 3 — new |
| `lib/livePlaybackBroker.js` | 3 |
| `lib/wvpLabClient.js` | 3 |
| `server.js` | 1 + 3 |
| `scripts/wvp-sip-lan-proxy.js` | 1 |
| `.env` | flags only |

**Not touched (frozen):** `public/js/video-wall.js`, `public/js/live-player-factory.js`, `public/index.html`, Firmware Gold pin cores.

**Idle / not on product path:** `lib/wvpFleetVoiceAdapter.js`, `lib/wvpVoiceUplink.js` (VoiceAdapter cancelled).

---

## 10. What we did **not** do (per plan + operator rules)

- No `public/**` edits for WVP  
- No “go back” second classic restore  
- No WVP REST audio as PTT  
- No bundling Step 1+2+3 in one freestyle APPLY  
- No 172.x as server IP  

---

## 11. Questions for Google

1. **Video UI attach:** With frontend frozen, is there a **backend-only** way to feed classic JSMpeg / wall player without touching `video-wall.js`? Or must we lift freeze for minimal `flvUrl`-on-ready?

2. **Soft ZLM overlay path:** Plan assumed `/api/live/playback` + existing `softAttachZlmOverlay` would suffice. It is blocked for Open All and ignores socket `flvUrl`. Was single-tile-only soft upgrade the intended scope?

3. **PTT 29201:** Cams on WVP `:5060` get Fleet `group config sent` but never `login ok` on 29201. Does Google expect dual SIP register, MESSAGE via WVP forward, or cam config change — **without** WVP broadcast audio?

4. **Apply order:** SOS ✅ → video backend ✅ / picture ❌ → PTT ❌. Confirm Google still wants video picture PASS before PTT work, or reorder.

---

## 12. Candidate next APPLYs (not executed — for Google + operator pick)

| Name | Scope | Intent |
|------|-------|--------|
| `MOB-APPLY-BACKEND-VIDEO-UI-FLV-ON-READY-V1` | Minimal `public/**` (freeze lift) | Paint `flvUrl` from `video-stream-ready`; skip or shorten JSMpeg-first |
| `MOB-APPLY-BACKEND-VIDEO-OPENALL-OVERLAY-V1` | Same freeze lift | Allow soft ZLM when Open All / multi-tile |
| `MOB-APPLY-PTT-29201-CONTACT-PROOF-V1` | Backend instrument only | Prove MESSAGE deliver vs cam ignore |
| `MOB-APPLY-PTT-FLEET-SIP-HOME-OR-DUAL-REG-V1` | Backend + possibly cam SIP home | Cam accepts Fleet group MESSAGE → opens 29201 |

---

## 13. One-line summary for Google

**We executed your backend split: ACL SOS ✅, WVP video handoff backend ✅, 5060 unchanged, frontend frozen, no WVP audio. Live picture and PTT still fail because frozen classic UI never paints handoff FLV (JSMpeg-first + soft overlay gap) and cams never join TCP 29201 while SIP-homed on WVP — need your call on minimal UI lift vs pure backend path, and PTT topology.**

---

## 14. Related docs index

| Doc | Topic |
|-----|-------|
| `MOB-DISC-BACKEND-ACL-AND-MEDIA-SPLIT-20260720.md` | Original plan / file list |
| `MOB-APPLIED-BACKEND-ACL-TRANSLATOR-V1-20260720.md` | Step 1 applied |
| `MOB-APPLIED-BACKEND-VIDEO-WVP-HANDOFF-V1-20260720.md` | Step 3 applied |
| `MOB-APPLIED-BACKEND-VIDEO-HANDOFF-STABLE-V1-20260720.md` | Step 3 stable |
| `MOB-DISC-SOS-OK-LIVE-PTT-DEAD-AFTER-ACL-20260720.md` | After Step 1 only |
| `MOB-DISC-NATIVE-29201-RESTORED-STILL-DEAD-20260720.md` | PTT diagnosis |
| `MOB-DISC-LIVE-STILL-DARK-AFTER-HANDOFF-STABLE-20260720.md` | Latest live picture gap |
