# MOB DISC / APPLY note — mvp-zlm-in-pack (2026-07-14)

**Status:** APPLIED — wiring only until Windows `MediaServer.exe` is placed  
**Search:** `mvp-zlm-in-pack`, `vendor/zlmediakit`, `FM_ZLM_SPAWN`

## What this MOB did

| Piece | Role |
|-------|------|
| `vendor/zlmediakit/` | Pack folder + README + `config.ini.example` |
| `scripts/INSTALL-ZLM-PACK.ps1` | Copy Windows MediaServer into vendor |
| `lib/zlmProcess.js` | Spawn child on boot when `FM_ZLM_SPAWN`/`FM_ZLM_PACK=1` |
| Fleet boot | `ensureStarted()` — healthy Docker/lab still OK; missing binary = skip |
| Ship pack | Copies ZLM binary into customer pack **if present** |
| Docker | Still **builder lab only** — not for customer |

## What you do (builder)

1. Get a **Windows** `MediaServer.exe` (not the Linux Docker binary).  
2. `.\scripts\INSTALL-ZLM-PACK.ps1 -SourceDir "…\folder-with-MediaServer.exe"`  
3. Set `.env`: `FM_ZLM_ENABLED=1`, `FM_ZLM_SPAWN=1`, `FM_ZLM_PACK=1`, secret match `config.ini`  
4. `RESTART-FLEET.bat` — log should show `zlm ensureStarted ok` or clear skip reason  

Wall / Open All rules unchanged (safe soft ZLM one-cam).

## Not this MOB

- Downloading a trusted Windows binary automatically (no stable official URL)  
- Turning off Docker lab on your bench  
- ZLM Open All  
