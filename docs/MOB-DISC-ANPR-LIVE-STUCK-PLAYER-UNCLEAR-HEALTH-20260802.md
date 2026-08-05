# MOB-DISC — ANPR Live stuck: BWC cut / Player unavailable / UNCLEAR / health needs refresh

**Date:** 2026-08-02  
**Operator symptom:** Live tile **Player unavailable** + roster **kk Connecting…**; rail full of **UNCLEAR**; must refresh page to see **ANPR Engine — OK** after starting `START-ANPR.bat`.  
**Cam:** `kk` / `34020000001329000009`

## Verdict (what actually happened)

Three separate layers stacked — not one “ANPR dual-engine broke video” failure.

| Layer | What logs show | Operator meaning |
|-------|----------------|------------------|
| **A. Live FLV / player** | `11:07:36` WVP handoff start + `wvp flv-stream proxy open`. UI later shows **Player unavailable**. Roster stays **Connecting…** / **0/4 LIVE**. | Browser FLV player lost or never proved the stream. Tile is stuck in error/connecting chrome. |
| **B. Stream/grab stress** | `10:21` many `anpr live grab skip` → `fr grab flv: timeout`, then `stop-video` surface `analytics-anpr`. Around `11:07:48` another grab timeout; other grabs still succeed ~1s. | BWC/FLV path was flaky. Poller sometimes still gets JPEG while the **tile player** is already dead. |
| **C. ANPR OCR** | `anpr track emit` with `plate:null`, `temporalLocked:false`, `unclear:true`, `engine:dual-lpr-v1` (tracks 1–4). One later emit `plate:"DE55"` track 6. | Dual-engine ran on macros but often **no locked plate** → UI correctly shows **UNCLEAR** (vehicle crop still saved). |
| **D. Health badge** | `refreshAnprStatus()` runs **only when entering the ANPR panel** (not on a timer). | Starting `START-ANPR.bat` does **not** push UI. Leave Analytics→ANPR and re-enter, or hard-refresh, to see **OK**. |

SIP side: device still sends **keepalive** (`wvp acl presence`) and status queries return `battery:null, signal:null` — BWC is not fully gone from WVP; live **view** is what’s stuck.

## Log anchors (service-stdout / fleet)

```
11:07:34  invite skipped | wvp_video_handoff | surface analytics-anpr
11:07:36  wvp video handoff start | flvHost 192.168.1.38:18088
11:07:36  wvp flv-stream proxy open
11:07:48  anpr live grab skip | fr grab flv: timeout
11:07:58..11:08:29  anpr track emit | plate:null | unclear:true | dual-lpr-v1
11:08:44  anpr track emit | plate:DE55 | unclear:false
(ongoing) device-status / keepalive for 34020000001329000009
```

Earlier same cam (`10:21`): FLV grab timeout storm → dashboard `stop-video` on `analytics-anpr`.

## Why it feels “stuck”

1. **Start watch** opened WVP FLV for kk.  
2. Player failed prove / dropped → tile **Player unavailable**; roster still thinks connecting.  
3. Poller kept sampling when FLV briefly worked → YOLO tracks → deferred OCR often **unclear** → UNCLEAR cards.  
4. Operator starts ANPR bat → sidecar OK, but badge only refreshes on **panel entry / page reload**.

Critical Watchlist banner correctly **collapsed** at 0 hits (not a regression).

## Operator recovery (do this first)

1. On ANPR Live: **Stop all**.  
2. Confirm kk is online (Ops / map / FR live). Power-cycle BWC if still dead video everywhere.  
3. **Start watch** again on kk only. Wait until tile is **Live** (not Player unavailable).  
4. If badge still wrong: click Snapshot then Live again, or hard-refresh once.  
5. Clear UI on Recent Plates if old UNCLEAR cards confuse the test.

## Not the root cause

- Cascaded dual-engine alone did not “cut” the BWC SIP registration (keepalives continue).  
- Missing Critical Watchlist empty box is intentional collapse when 0 hits.  
- Refresh for **ANPR OK** is a **UI poll gap**, not sidecar failure after bat start.

## Recommended next MOB (apply only after go-ahead)

| Priority | MOB | Why |
|----------|-----|-----|
| 1 | `ANPR-LIVE-PLAYER-RECOVER-V1` | On Player unavailable / signal lost → clear tile + one auto re-`start-video` / re-attach FLV (parity with FR). |
| 2 | `ANPR-HEALTH-POLL-WHILE-OPEN-V1` | Poll `/api/analytics/anpr/health` every ~10s while ANPR panel visible so START-ANPR.bat shows OK without full refresh. |
| 3 | (later) OCR field quality | UNCLEAR flood when temporal not locked — separate from live video stuck. |

**Recommendation:** do **1** then **2**. Do not park WVP handoff.

## Files (reference only — no code in this disc)

- `storage/service-stdout.log` — media/ANPR emit lines  
- `public/js/analytics-hub.js` — `refreshAnprStatus` on panel show only  
- `public/js/anpr-live-watch.js` — FLV attach / PLAYER_ERROR  
- `lib/anprLivePoller.js` — grab + track emit  

## Locked

Diagnosis paper only until user says **MOB-APPLY** for a named fix above.
