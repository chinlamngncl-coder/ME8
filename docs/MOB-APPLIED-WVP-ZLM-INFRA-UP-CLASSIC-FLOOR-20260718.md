# MOB APPLIED — mob-wvp-zlm-infra-up-classic-floor

**Date:** 2026-07-18  
**APPLY:** `MOB-APPLY mob-wvp-zlm-infra-up-classic-floor`  
**Disc:** `MOB-DISC-WVP-ZLM-INFRA-UP-CLASSIC-FLOOR-20260718.md`

---

## Scope

| Did | Did **not** |
|-----|-------------|
| Align compose SIP publish to **`:15061`** (proxy target) | Flip `FM_LAB_WVP` / Soft Open / presence |
| Fix `START-WVP-LAB.ps1`: ensure SIP proxy, correct operator map | Rekey BWC to WVP |
| Operator MOB DISC (ports / platform / after Fleet restart) | Soft Open UI / broker primary |
| Prove stack already up on desk | Touch gold pin / wall / PTT cores |

---

## Files

| File | Change |
|------|--------|
| `docker/wvp/docker-compose.wvp.yml` | Host SIP map **`15061:5060`** (not 5061) |
| `scripts/START-WVP-LAB.ps1` | Start/keep `wvp-sip-lan-proxy`; print classic-floor map; `-RestartProxy` |
| `docs/MOB-DISC-WVP-ZLM-INFRA-UP-CLASSIC-FLOOR-20260718.md` | Operator cheat sheet |
| `docs/MOB-APPLIED-WVP-ZLM-INFRA-UP-CLASSIC-FLOOR-20260718.md` | This stamp |

---

## Desk proof at APPLY (already running)

| Check | Result |
|-------|--------|
| `me8-wvp` / `me8-wvp-zlm` / db / redis | Up |
| `http://127.0.0.1:18080` | 200 |
| `http://127.0.0.1:18088` (ZLM API probe) | 200 |
| Host `:5060` | `wvp-sip-lan-proxy.js` |
| Host `:15061` | Docker WVP SIP |
| Fleet `:3988` / `:5062` | Listening |
| `.env` classic flags | Still `0` |

---

## You do

1. **No WVP restart** if UI already opens.  
2. After any Fleet restart: classic smoke on `:3988` only.  
3. Optional: open `:18080` admin/admin — page load = infra OK.  
4. Next APPLY when ready for thin lab play (not Soft Open pile).

**One line:** Infra mapped and start script fixed; classic flags untouched; WVP left running if healthy.
