# MOB DISC / GOOGLE HANDOFF — Ops blank while WVP FLV is alive (2026-07-19)

**Status:** DISC + log pack for Google · operator keeps Open All open · blanks on Ops  
**Search:** blank wall, invite 408, FLV 200, soft ZLM after JSMpeg, CORS, cache bust  
**LAN:** `192.168.1.38` (never 172 as server IP) · Dashboard `:3988` · WVP UI `:18080` · ZLM FLV `:18088` · SIP WVP direct `:5060` · Fleet YDT `:5062`

---

## Operator report

Keeping both BWCs “open” on Ops — **roster can be green, panels stay blank** (no video light-up).

---

## One-screen verdict

| Layer | Status |
|-------|--------|
| BWC → WVP REGISTER `:5060` | OK (Platform Connected) |
| WVP `startPlay` → ZLM FLV | **OK** — stream bytes real (`FLV` header) |
| Broker `/api/live/playback` | **OK** after URL fix → `engine:zlm` + absolute `:18088` URL |
| Ops Open / Open All | Still emits **Fleet SIP INVITE** → **`408`** |
| Wall picture path | Soft mpegts only runs **after** JSMpeg attach (`scheduleWallZlmSoftUpgrade` +2.2s) |
| Browser | Likely not showing ZLM: **stale cache** and/or **CORS** (page origin vs `:18088`) and/or soft path never fires if player attach fails |

**Not a WVP play failure.** Backend can pull FLV. Ops UI path still couples Open → Fleet INVITE 408 + delayed soft-ZLM overlay.

---

## Env (live)

```
FM_LAB_WVP=1
FM_WVP_FLEET_PRESENCE=1
FM_WVP_DIRECT_FLV=1
FM_WVP_ZLM_HTTP_PORT=18088
FM_SOFTOPEN_WVP_ONLY=0
WVP_SIP_PROXY_LISTEN=0
FM_WVP_THIN_CAMS=
```

SIP proxy: **off** (WVP owns host `:5060` via Docker).

---

## Devices (WVP API)

```
[{"id":"34020000001329000009","online":true,"ip":"172.21.0.1"},
 {"id":"34020000001329000008","online":true,"ip":"172.21.0.1"}]
```

Note: WVP stores device IP as Docker gateway `172.21.0.1` (NAT view). Play still succeeds (ACK to that peer). Do **not** tell operator to use 172 as dashboard/SIP server IP.

---

## Broker / startPlay (Node check after URL crash fix)

```
STARTPLAY 34020000001329000008
  directFlv: http://192.168.1.38:18088/rtp/34020000001329000008_34020000001329000008.live.flv?originTypeStr=rtp_push
  flvUrl:    /api/lab/wvp/flv?labWvp=…

DESC 34020000001329000008
  {"ok":true,"engine":"zlm","source":"wvp-zlm",
   "flvUrl":"http://192.168.1.38:18088/rtp/34020000001329000008_34020000001329000008.live.flv?originTypeStr=rtp_push"}

DESC 34020000001329000009
  {"ok":true,"engine":"zlm","source":"wvp-zlm",
   "flvUrl":"http://192.168.1.38:18088/rtp/34020000001329000009_34020000001329000009.live.flv?originTypeStr=rtp_push"}
```

Earlier crash (fixed on disk): `play.flvUrl` relative → `new URL(flvUrl)` threw → broker `idle`. Prefer `directFlv` now.

---

## FLV byte proof (host → ZLM)

```
GET http://127.0.0.1:18088/rtp/34020000001329000008_…live.flv
FLV_READ bytes=64 hex=46-4C-56-01-05-…   (ASCII "FLV" …)
```

Stream is **not empty** on the wire.

---

## Fleet log (Ops open → classic INVITE dies)

```
2026-07-19 02:23:04.056 +08:00 [SIP] ERR invite failed | {"status":408}
2026-07-19 02:23:04.209 +08:00 [SIP] ERR invite failed | {"status":408}
```

Cams do **not** REGISTER to Fleet `:5062`. Presence green ≠ Fleet contact. Open All still starts Fleet INVITE → 408. Anti-harassment: **no INVITE auto-retry loops** (operator law).

---

## WVP Docker log (play success while Ops blank)

```
[开始点播] deviceId：34020000001329000008 …
[点播开始] … 收流端口：30088 … TCP-PASSIVE …
[回复ack] 34020000001329000008-> 172.21.0.1:46040
[ZLM HOOK]推流鉴权 … stream=34020000001329000008_…
[ZLM HOOK] 流注册 … rtp/34020000001329000008_…
[点播成功] deviceId: 34020000001329000008 …

[开始点播] deviceId：34020000001329000009 …
[点播成功] deviceId: 34020000001329000009 …
```

WVP↔cam INVITE/ACK + ZLM publish = **PASS**.

Also saw earlier:
```
[停止点播/回放/下载] 34020000001329000008 … [发送BYE]
```
(stop when play session torn down — relevant if UI open/close races).

---

## Frontend coupling (why blank despite FLV)

`public/js/video-wall.js`:

1. Open → `emitOpsStartVideo` → Fleet path  
2. `attachCanvasPlayer` → **JSMpeg** on `ws://host:3989/?camId=`  
3. Only then `scheduleWallZlmSoftUpgrade` (+**2200 ms**) → `fetchDescriptorPreferZlm` → `softAttachZlmOverlay` (mpegts)

```
wallZlmSoftUpgradeAllowed()  // now always true if Me8LivePlayerFactory present
scheduleWallZlmSoftUpgrade() // requires players.has(slot) first
```

Cache versions still in `index.html` (may serve **stale** wall/factory to browser):

```
/js/live-player-factory.js?v=20260717-kill-reopen-storm
/js/video-wall.js?v=20260718-pin-dock-no-top-jam
```

**CORS risk:** if Ops is `http://localhost:3988` and mpegts loads `http://192.168.1.38:18088/...`, browser may block cross-origin FLV → blank overlay even when curl FLV works. Prefer Ops URL `http://192.168.1.38:3988` same-LAN host, or proxy FLV same-origin (`/api/lab/wvp/flv`).

---

## Architecture snapshot (current)

```
BWC ──REGISTER──► 192.168.1.38:5060 ──► WVP Docker (direct bind)
BWC ──RTP───────► ZLM :18088 FLV   ✓ (proven)

Ops Open All ──► Fleet INVITE :5062  ✗ 408
Ops soft ZLM ──► /api/live/playback → mpegts(:18088)  (delayed; cache/CORS/attach gating)
Ops green ─────► FM_WVP_FLEET_PRESENCE poll WVP API
```

---

## Questions for Google

1. How should Ops Open All attach **mpegts WVP/ZLM primary first** without waiting for Fleet JSMpeg / without Fleet INVITE at all when cams are WVP-only?  
2. Same-origin FLV proxy vs CORS headers on ZLM for `localhost` vs LAN dashboard?  
3. WVP `hostAddress` / device IP stuck at `172.21.0.1` after removing Node SIP proxy — OK for play today; risk for INVITE/RTP under NAT later?  
4. Keep FFmpeg as **manual** fallback only (no SIP INVITE harassment / auto-retry).

---

## Operator quick checks (no code)

1. Open Ops as **`http://192.168.1.38:3988`** (not localhost)  
2. Hard refresh (Ctrl+F5) — cache `?v=` is stale relative to wall edits  
3. Paste FLV URL in a new tab — if video plays in browser, ZLM is fine and Ops attach is the bug  
4. DevTools → Network: any `playback?camId=` / `.flv` / CORS errors?

---

**One line for Google:** WVP+ZLM play and FLV bytes are good; Ops stays blank because Open All still Fleet-INVITE-408 + soft mpegts is a delayed secondary path behind JSMpeg, with stale cache and likely CORS/origin mismatch.
