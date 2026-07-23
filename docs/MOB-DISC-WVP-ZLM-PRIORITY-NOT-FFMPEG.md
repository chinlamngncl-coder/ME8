# MOB DISC — Operator priority: **WVP-ZLM live**, not Fleet FFmpeg (locked)

**Status:** DISC only — no code  
**Date:** 2026-07-16  
**Trigger:** Operator anger — keep hearing FFmpeg / soak on FFmpeg while they have said many times they want **WVP-ZLM**.

**Search:** `wvp zlm priority`, `not ffmpeg live`, `open all zlm`, `agent stop ffmpeg default`

---

## Locked operator intent (life-and-death for live genre)

| Rule | Detail |
|------|--------|
| **Live product path they want** | **WVP → ZLM → wall play** (WVP-ZLM) |
| **Fleet FFmpeg / JSMpeg pool** | **Fallback / safety / transitional only** — not the soak target, not the “we’re done” story |
| **Honesty** | Log proof = `live broker wvp-zlm primary` (+ overlay on ZLM). Invite/pool RTP/WS alone = **FFmpeg**, say so. Never call FFmpeg soak a WVP-ZLM pass |
| **Agent behavior** | Stop steering live work toward “another FFmpeg prove / soak / fix” when operator is asking for ZLM. Next live MOB = **make wall actually use WVP-ZLM** for the way they test (incl. **2 cam / Open All**) |
| **Do not confuse genres** | Evidence **redact face-follow** burn ≠ live path. That MOB is separate. Live genre = WVP-ZLM |

---

## Why recent 2-cam soak was FFmpeg (not “we chose FFmpeg for you”)

Code today **blocks** soft ZLM when more than one wall cam / Open All:

- `wallZlmSoftUpgradeAllowed()` in `public/js/video-wall.js` → false if `wallActiveCamIds().length > 1` or Open All reserved
- Underneath always starts Fleet invite → pool → JSMpeg
- Broker may prefer WVP-ZLM for `/api/live/playback`, but **multi-cam wall never soft-upgrades**
- Soak log: pool invite/RTP — **zero** `live broker wvp-zlm primary` on that window

So: operator opened **2 BWC live** (their real test) → product stayed on **Fleet FFmpeg by design**. That is the gap. Saying “FFmpeg worked 7 min” is **not** delivering WVP-ZLM.

---

## What already exists (partial — not enough)

| Piece | Status |
|-------|--------|
| WVP lab + ZLM Docker | Lab up |
| Broker prefer WVP-ZLM when `FM_LAB_WVP=1` | Applied (`mob-wvp-live-adapter-enable-zlm-primary-lab-v1`) |
| Soft overlay on wall | **One cam only** |
| Open All / 2+ cam | **Still Fleet FFmpeg** |
| FFmpeg auto-fallback when ZLM fails | Applied — **safety**, not primary story |

Partial broker primary ≠ operator got WVP-ZLM on Open All.

---

## Status

**APPLIED** 2026-07-16 — `mob-wvp-wall-multi-cam-zlm-v1`  
See `docs/MOB-APPLIED-WVP-WALL-MULTI-CAM-ZLM-V1.md`  
Honesty failure disc: `docs/MOB-DISC-WVP-FFMPEG-SOAKS-WERE-NOT-ZLM.md`

---

## Next MOB (paper — needs explicit MOB-APPLY)

**Name:** `mob-wvp-wall-multi-cam-zlm-v1` — **DONE**

Follow-up only if 2-cam still lacks `live broker wvp-zlm primary` after hard refresh (broker/WVP register, not wall gate).

**Out of scope unless listed:** pin mirror rewrite, PTT/SIP cores, evidence redact, uninstall service.

---

## Agent apology / correction (locked)

- Wrong to keep answering live asks with FFmpeg-centric next steps when operator said **WVP-ZLM**.
- Wrong to treat “routes enabled” or “FFmpeg stable soak” as WVP-ZLM success.
- Right: admit FFmpeg when log says FFmpeg; then **propose ZLM wall MOB**, not another FFmpeg soak.

---

## Related

- Honest 2-cam soak: `docs/MOB-DISC-WVP-SOAK-2CAM-NOT-ZLM-20260716.md`
- Broker primary lab: `docs/MOB-DISC-WVP-LIVE-ADAPTER-ENABLE-ZLM-PRIMARY-LAB-V1.md`
- Architecture: `docs/MOB-DISC-WVP-ZLM-FFMPEG-FALLBACK-ARCHITECTURE.md` (FFmpeg = fallback when ZLM fails)

---

## One line

**You want WVP-ZLM on the wall (including multi-cam). Multi-cam soft gate lifted 2026-07-16 — prove with log `live broker wvp-zlm primary`, not another silent FFmpeg soak.**
