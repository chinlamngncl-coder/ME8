# MOB APPLIED — DASHBOARD-HTTPS-LAN-V1 (Track C1)

**Date:** 2026-07-23  
**Phrase:** `MOB-APPLY DASHBOARD-HTTPS-LAN-V1`  
**Disc:** `MOB-DISC-TLS-HTTPS-GENRE-START-C1-20260723.md`

## What this closes

Ops dashboard can listen on **HTTPS** (lab self-signed) on a real LAN IP while **HTTP stays** for local fallback. Second PC can open `https://<LAN-IP>:4438` (accept cert warning once) and reach login — secure context for mic **page**.  

**Not in this MOB:** `wss://` for video/audio raw ports (C2), same-origin FLV proxy (C3), trust-proxy (C4), PTT visual alert, Tactical.

## Implementation

| Piece | Role |
|-------|------|
| `lib/dashboardTls.js` | Resolve `FM_HTTPS_*`, load PEM |
| `scripts/ensure-lab-dashboard-tls-certs.js` | Self-signed SAN cert (OpenSSL / Git OpenSSL / PS fallback) — LAN via `Get-UbitronPreferredLanIPv4` (never 172.17–31) |
| `server.js` | Keep `http.createServer`; optional `https.createServer` + `io.attach(httpsServer)`; auto-ensure certs when enabled |
| `.env.example` / `.env.me8.example` | Document / ME8 default `FM_HTTPS_ENABLED=1`, port **4438** |
| `.gitignore` | `certs/lab-dashboard/` |
| `scripts/verify-dashboard-https-lan.js` | `npm run verify:https-lan` |

## Env (lab)

```
FM_HTTPS_ENABLED=1
FM_HTTPS_PORT=4438
# optional: FM_HTTPS_LAN_IP=192.168.1.38
# optional: FM_HTTPS_EXTRA_HOSTS=
```

HTTP remains on `FM_HTTP_PORT` (lab **3988**).

## Agent checks

- `node scripts/ensure-lab-dashboard-tls-certs.js` → PASS (SAN includes localhost + preferred LAN)  
- `node scripts/verify-dashboard-https-lan.js` → PASS  
- Dual listen smoke (http + https `/api/health`) → PASS  

## Operator verify (PASS / FAIL)

1. Restart Fleet (`LAB-CONSOLE-START` / `RESTART-FLEET`).  
2. On **this PC:** `http://localhost:3988` still works.  
3. On **this PC or second PC:** open `https://192.168.1.38:4438` (use your real Wi‑Fi IP from the ensure script / console log — **not** 172.x).  
4. Browser shows cert warning → **Advanced → proceed** (lab self-signed).  
5. **PASS:** login page loads over HTTPS.  
6. Expect: live video/audio may still complain until **C2** (`WSS-VIDEO-AUDIO-SOCKETS-V1`) — that is OK for C1.

If LAN IP changed: `node scripts/ensure-lab-dashboard-tls-certs.js --force` then restart.

## Next (not applied)

`MOB-APPLY WSS-VIDEO-AUDIO-SOCKETS-V1`
