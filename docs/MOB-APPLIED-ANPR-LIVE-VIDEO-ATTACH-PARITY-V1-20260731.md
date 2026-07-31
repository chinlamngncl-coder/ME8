# MOB APPLIED — ANPR-LIVE-VIDEO-ATTACH-PARITY-V1

**Date:** 2026-07-31  
**APPLY:** `MOB-APPLY ANPR-LIVE-VIDEO-ATTACH-PARITY-V1`  
**Status:** APPLIED — await operator PASS  

**Discs:**  
- `MOB-DISC-ANPR-LIVE-CONNECTING-STUCK-KK-20260731.md`  
- `MOB-DISC-LIVE-VIDEO-OPS-CW-FR-VS-ANPR-REALITY-20260731.md`  
- `MOB-DISC-ANPR-FR-CONCURRENT-LIVE-NOT-MUTEX-20260731.md`

---

## What changed

| Item | Detail |
|------|--------|
| Attach | FR contract: FLV on `flvUrl`, else **JSMpeg**; prove / fail / signal timer |
| Concurrent | Still `surface: analytics-anpr` — works **with** Face (`analytics-fr`), not mutex |
| Empty slots | FR-style idle: **Select BWCs and Start watch** — not bare Waiting / not “watching” on tiles |
| Watching empty | **Waiting for slot** (same as FR) |
| Meta `{live}` | **Proven** `is-live` tiles only |
| Roster | Proven → Live N; on-tile not proven → Connecting…; selected off-tile → Rotate |
| Cache | `anpr-live-watch.js?v=20260731-anpr-live-attach-parity-v1` |

**Files:** `public/js/anpr-live-watch.js`, `public/index.html`, `public/locales/en.json`

---

## Operator PASS

1. Hard refresh dashboard.  
2. ANPR → Live → select **kk** → Start watch → tile shows **moving video** (not eternal Connecting).  
3. Empty tiles show **Select BWCs and Start watch** before Start; after Start unused slots show **Waiting for slot**.  
4. Optional: Face Live on kk still running, then ANPR Live on kk → ANPR picture too.

**FAIL:** Connecting forever, or empty slots say “watching” / bare Waiting only.
