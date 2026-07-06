# MOB DISC — Gate B: ZLM healthy but no video (2026-07-06)

**Status:** **RESOLVED** — Gate B **PASS** 2026-07-06 (`docs/MOB-DISC-ZLM-GATE-B-PASS.md`)  
**Search:** `Gate B no video`, `FLV player error`, `relay ffmpeg`, `mpeg1`

---

## What the operator saw

`test-zlm.html` after secret fix:

| Signal | Value |
|--------|--------|
| Badge | **zlm** (green) |
| Status | `zlmHealthy=true` |
| Relay | first frame ~38 KB |
| Player | spinner, `0:00`, then **ZLM FLV player error** ~15 s later |

Secret mismatch is **fixed** — this is a **different** failure.

---

## Root cause (fleet.log)

```
zlm relay first frame | camId 34020000001329000008 | rtmp://127.0.0.1:19350/live/...
zlm relay ffmpeg | Could not write header (incorrect codec parameters ?): Invalid data found when processing input
zlm relay ffmpeg exit | code 1
zlm relay stopped | bytes 542756
```

**Why:** Gate B relay subscribes to the **same pool WebSocket** the wall uses. That stream is **MPEG-TS carrying `mpeg1video`** (JSMpeg path in `liveStreamPool.js`).

Relay was built with `-c:v copy` → FLV/RTMP. **FLV does not accept MPEG-1 video copy.** FFmpeg dies ~5 s after first frame; browser FLV player errors when ZLM has no live stream.

This is **not** a ZLM secret, Docker, or browser CORS issue.

---

## Fix (Gate B lab only)

**File:** `lib/zlmLabRelay.js` — transcode pipe input to H.264 before RTMP publish:

- `-c:v libx264 -preset ultrafast -tune zerolatency` (replace `-c:v copy`)
- Match pool probe flags for MPEG-TS demux from pipe

**Does not touch:** `liveStreamPool.js`, `video-wall.js`, `server.js` start-video.

---

## Retest (operator)

1. `RESTART-FLEET.bat` (picks up relay fix)
2. Dashboard → **Open All** (Chin live on wall)
3. `http://192.168.1.38:3988/test-zlm.html?camId=34020000001329000008`
4. **Refresh status** → **Play**
5. Expect: video within a few seconds, badge stays **zlm**, log shows `ZLM FLV play ok` **without** player error

Reply **GATE B PASS** or **FAIL**.

---

## If still FAIL

| Check | Action |
|-------|--------|
| Relay dies again | `VIEW-LOG.bat` → search `zlm relay ffmpeg` |
| FFmpeg fallback works, ZLM does not | relay/ZLM path only — wall still OK |
| No first frame | Start live on wall first |

---

## Related

- `docs/MOB-DISC-ZLM-ARCHITECTURE-PROPOSAL.md` — Gate B scope  
- `docs/MOB-DISC-ZLM-NOT-READY.md` — why pool hooks are forbidden
