# MOB DISC / GOOGLE HANDOFF — Pin blank + wall “low res” after ZLM-primary-v2 (2026-07-19)

**Status:** DISC + log pack for Google · no APPLY  
**Search:** pin blank, map mirror canvas, ZLM video overlay, 1280x720, 无人观看, soft low res  
**Related APPLYs:** `MOB-APPLY-FRONTEND-ZLM-PRIMARY-V2`, direct SIP bind, URL crash fix, presence sync  
**LAN:** `192.168.1.38` · Ops `:3988` · ZLM FLV `:18088` · WVP `:18080` · SIP `:5060` (WVP direct)

---

## Operator report

- **Wall panel:** video works now (progress) but looks **very low resolution**  
- **Map pin video:** **nothing shown**

---

## One-screen verdict

| Symptom | Root cause (evidence) |
|---------|------------------------|
| Pin blank | Pin path is still **Firmware Gold canvas mirror** from wall **JSMpeg canvas**. ZLM-primary wall mounts **`<video>` mpegts**, not canvas → `wallCanvasForCam` = null → mirror fails → pin falls back to JSMpeg pool WS → no Fleet RTP → **blank** |
| “Low res” wall | ZLM track is **H.264 1280×720 @ 20fps** (`isSubStream=false`). Not CIF substream. Soft look is likely **UI scale / panel size / object-fit**, not wrong stream type — confirm on fullscreen FLV URL |
| Unstable / drops | ZLM **无人观看 → close stream → WVP BYE** while Ops thinks it is still open (`readerCount: 0` seen on probe) |

Something is still wrong architecturally: **wall picture engine and pin mirror contract are mismatched**.

---

## Architecture break (after ZLM-primary-v2)

```
BEFORE (Firmware Gold):
  Wall = JSMpeg canvas ──RAF mirror──► Pin canvas   ✓

NOW (ZLM primary):
  Wall = <video class="me8-zlm-soft-overlay"> mpegts
  Pin  = startMapMirrorFromWall() needs wallCanvasForCam()
       = null ──► attachMapPopupPlayer JSMpeg on :3989
       = no Fleet stream ──► blank pin
```

Code contracts (unchanged pin logic — intentional protect):

- `startMapMirrorFromWall` → requires `wallCanvasForCam(camId)`  
- `attachMapPopupPlayer` → mirror if wall canvas decoded; else pin JSMpeg  
- Wall ZLM mount does **not** create a canvas or register pin-safe source

---

## Logs / measurements

### ZLM mediaInfo (Chin stream while alive)

```
stream: 34020000001329000008_34020000001329000008
originTypeStr: rtp_push
tracks:
  H264  width=1280  height=720  fps=20  gop_size=25
  PCMA  8000 Hz
bytesSpeed ~151259
readerCount: 0    ← nobody counted watching at sample time
```

→ Upstream is **720p main-class**, not sub-CIF.  
→ Operator “low res” ≠ API substream flag (wvpLabClient already uses `?isSubStream=false`).

### WVP play logs

```
[点播成功] deviceId: 34020000001329000008 … 码流类型：null
[回复ack] 34020000001329000008-> 172.21.0.1:46040
[ZLM HOOK] 流注册 … rtp/34020000001329000008_…

[ZLM HOOK]流无人观看 … rtp/34020000001329000008_…
[ZLM HOOK]流无人观看是否触发关闭：true
[ZLM HOOK] 流注销 …
[停止点播/回放/下载] … [发送BYE]
```

Same pattern for `…0009`.  
→ ZLM/WVP **auto-stops play when no FLV readers**. If browser player disconnects or never registers as reader, picture dies even though Ops UI still “open”.

### Broker / FLV

```
engine:zlm
flvUrl: http://192.168.1.38:18088/rtp/34020000001329000008_….live.flv
startPlay isSubStream=false (client)
```

### Fleet

Pin/JSMpeg path still has no Fleet REGISTER on `:5062` (INVITE 408 when fallback used). Wall ZLM path skips INVITE — good for wall, bad for pin JSMpeg fallback.

---

## Why wall looks soft (hypotheses ranked)

1. **Display:** small Ops panel + `object-fit:contain` + CSS upscale of 720p → looks soft (not wrong encode)  
2. **No fullscreen compare:** paste FLV URL in new tab at native size — if sharp, UI layout issue  
3. **Bitrate/fps:** 20fps / BWC encode under GB may look softer than classic FFmpeg path operator remembers  
4. **Not** `isSubStream=true` in current client (already false)

---

## Questions for Google

1. **Pin:** With wall on mpegts `<video>`, should pin (a) mirror from `<video>` (drawImage video→canvas), (b) second mpegts on same FLV URL, or (c) keep canvas-only gold and force wall to also keep a hidden canvas? (Map pin was protected — need explicit product choice.)  
2. **None-viewer close:** How to keep WVP/ZLM play alive for Ops duration without harassment retries — disable 无人观看 close for lab, or heartbeat FLV reader?  
3. **“Low res”:** If media is 1280×720, is Ops CSS/layout the fix, or force higher BWC profile / different WVP stream type?  
4. Keep **no SIP INVITE auto-retry** (operator death sentence).

---

## Operator checks (no code)

1. With wall live, open FLV in new tab:  
   `http://192.168.1.38:18088/rtp/<deviceId>_<deviceId>.live.flv`  
   — sharp 720p? then wall is display, not encode.  
2. Pin blank expected until pin path understands ZLM `<video>` (not a cam failure).  
3. Watch WVP log for `流无人观看` right when picture dies.

---

**One line for Google:** Wall ZLM works (720p on wire) but broke Firmware Gold pin-canvas-mirror; pin falls back to dead Fleet JSMpeg; soft look is likely UI/scale not substream; ZLM none-viewer auto-BYE is killing streams.
