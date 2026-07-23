# MOB APPLIED — mob-wvp-zlm-thin-picture-chin-v1

**Date:** 2026-07-18  
**APPLY:** `MOB-APPLY mob-wvp-zlm-thin-picture-chin-v1`  
**Prior disc:** `MOB-DISC-NEXT-APPLY-WVP-ZLM-THIN-PICTURE-20260718.md`

---

## What changed

| File | Change |
|------|--------|
| `lib/livePlaybackBroker.js` | Chin allowlist → `tryWvpZlmPrimary` → log `live broker wvp-zlm primary` or fail-open |
| `server.js` | Skip Fleet INVITE for thin cam only; stop bridge calls WVP stop for thin cam |
| `.env` | `FM_LAB_WVP=1` · `FM_WVP_THIN_CAMS=…0008` · Soft Open-only **0** · presence **0** |

**Not touched:** Soft Open UI pile · gold pin cores · kk · PTT/SOS cores.

---

## Env (locked for this MOB)

```text
FM_LAB_WVP=1
FM_SOFTOPEN_WVP_ONLY=0
FM_WVP_FLEET_PRESENCE=0
FM_WVP_THIN_CAMS=34020000001329000008
```

kk is **not** in the thin list → stays classic Fleet/FFmpeg.

---

## You do now

1. **`RESTART-FLEET.bat`** (must reload `.env` + broker).  
2. Wait ~15s.  
3. Chrome → **`http://localhost:3988`**  
4. Open **Chin only** (one live — not Open All).  
5. Wait ~3–5s after picture.  
6. Tell me one of:
   - **`zlm-ok`** — picture good (agent will confirm log `wvp-zlm primary`)
   - **`still-ffmpeg`** — picture ok but looks like before
   - **`black`**
   - **`broke-sos-ptt`**

---

## Honest topology

WVP `startPlay` needs Chin **reachable on WVP**.  
If log shows `wvp_startplay_failure` while Chin is Fleet-only `:5062`, picture fail-opens — say **`still-ffmpeg`** / **`black`** and we do a **named** dual-GB step next (not Soft Open UI).

---

## Rollback

`.env`: `FM_LAB_WVP=0` and clear `FM_WVP_THIN_CAMS` → restart.  
Or `RUN RESTORE-ME8-CLASSIC-PASS-20260718`.

**One line:** Chin-only thin WVP→ZLM broker on; Soft Open UI frozen; restart Fleet → open Chin once → report zlm-ok / still-ffmpeg / black / broke-sos-ptt.
