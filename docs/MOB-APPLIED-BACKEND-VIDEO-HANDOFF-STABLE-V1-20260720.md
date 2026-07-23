# MOB-APPLIED — Backend video handoff stable V1

**APPLY:** `MOB-APPLY-BACKEND-VIDEO-HANDOFF-STABLE-V1`  
**Date:** 2026-07-20  
**Frontend:** frozen — no `public/**`

---

## Fixes

| Issue | Change |
|-------|--------|
| Open All / dual `startPlay` storm | Per-cam serialize + **500ms** global start gap |
| stop then immediate re-open | Soft-stop **4s** grace → reuse FLV session |
| ssrc / play fail | Hard stop + **one retry** after 900ms |
| FLV on bare `:80` | Force **`FM_WVP_ZLM_HTTP_PORT=18088`** |
| Garbled WVP errors | UTF-8 body decode + sanitize ASCII reason |

**5060:** unchanged.

---

## Smoke

1. Hard refresh  
2. Open **one** live first (not Open All) — wait for picture  
3. Log: `wvp video handoff start` `path:backend-video-handoff-stable-v1` · FLV host with **:18088**  
4. Stop → re-open within ~4s → expect `reused:true`  
5. Cold SOS still OK  

PTT still later APPLY.
