# MOB — Persist WVP bundled ZLM config.ini

**Status:** APPLIED 2026-07-14 — `mob-wvp-bundled-zlm-persist`  
**Scope:** WVP lab Docker only. No Fleet wall / Open All / `me8-zlm`.

## Change

| Item | Path |
|------|------|
| Host config | `docker/wvp/zlm-bundled/config.ini` (snapshot from live container) |
| Mount | `./zlm-bundled/config.ini` → `/opt/media/config.ini:ro` in `docker-compose.wvp.yml` |
| Docs | `docker/wvp/zlm-bundled/README.md`, `docker/wvp/README-WVP-LAB.md` |

Verified after recreate: mount present; `modifyStamp=0`, `mergeWriteMS=0`, `mediaServerId=nWLUj7rfjM0JXWo8`.

## Next (when you say APPLY)

`mob-wvp-bundled-zlm-stamp-tune` — edit **this** host ini only (keys this 2021 binary understands), recreate, one soak.

Disc: `docs/MOB-DISC-WVP-PROPER-SCALE-NOT-TWO-CAMS.md`
