# MOB APPLIED — LAB-DEFAULT-CREDS-AND-IMAGE-PIN-V1

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY LAB-DEFAULT-CREDS-AND-IMAGE-PIN-V1`  
**Disc / handoff:** `MOB-DISC-THIRD-PARTY-SECURITY-HARDENING-HANDOFF-20260722.md` (B1)

## What changed

| Item | Before | After |
|------|--------|-------|
| LiveKit ingress image | `livekit/ingress:latest` | **`livekit/ingress:v1.8.4`** (matches server/egress) |
| LiveKit keys in git | `devkey: secret` in `livekit.yaml` + bare compose | Template placeholders; **`livekit.runtime.yaml`** (gitignored) built by `START-LIVEKIT.ps1` from `FM_LIVEKIT_*` |
| Egress / ingress API keys | Hardcoded `devkey` / `secret` | `${FM_LIVEKIT_API_KEY:-…}` / `${FM_LIVEKIT_API_SECRET:-…}` |
| WVP platform / DB / Valkey passwords | Bare literals in compose + yml | `${WVP_PWD}` / `${WVP_DB_*}` / `${WVP_REDIS_PASSWORD}` (lab `:-` fallbacks for bench) |

## Files

- `docker/livekit.compose.yaml`, `docker/livekit.yaml`
- `scripts/START-LIVEKIT.ps1`, `scripts/START-WVP-LAB.ps1`
- `docker/wvp/docker-compose.wvp.yml`, `docker/wvp/wvp-config/application-modern.yml`
- `ship-build-test/customer-pack/docker/livekit.*` (mirrored)
- `.gitignore` — `livekit.runtime.yaml`
- `.env.example` — WVP_* + LiveKit notes
- `scripts/verify-lab-default-creds-and-image-pin.js` + `npm run verify:lab-creds`

## Lab continuity

Bench still works **without** editing `.env`: fallbacks remain `devkey`/`secret` and WVP `admin123` / DB `root123` / redis `root`.  
Cameras keep using whatever `WVP_PWD` resolves to (default still `admin123`).

## Operator verify

1. `npm run verify:lab-creds` → PASS (agent already ran).  
2. Optional: `.\scripts\START-LIVEKIT.ps1` — VC still joins; ingress image is v1.8.4.  
3. Optional: `.\START-WVP-LAB.bat` — cams still register (same platform pwd unless you changed `.env`).  
4. Before **customer expose / pack**: set strong `FM_LIVEKIT_API_KEY` / `FM_LIVEKIT_API_SECRET` and `WVP_PWD` / `WVP_DB_PASSWORD` / `WVP_REDIS_PASSWORD` in `.env` (never commit).

## Outside this MOB

- Floating `gemcjz/wvp-pro:latest` / `zlmediakit:master` — not pinned here (handoff B7 later).  
- WVP UI login `admin`/`admin` — image schema default; separate if you change it.  
- `SEC-NONSIP-ID-CRYPTO-RANDOM-V1` — optional next.
