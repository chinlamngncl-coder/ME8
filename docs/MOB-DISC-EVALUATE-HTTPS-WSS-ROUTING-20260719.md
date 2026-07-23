# MOB DISC — Evaluate HTTPS / WSS routing (NO APPLY)

**Status:** DISC only — 2026-07-19 · **no config change · no APPLY**  
**Subject:** `MOB-DISC-EVALUATE-HTTPS-WSS-ROUTING`  
**Context:** Operator needs network IP/domain + secure context for mic (PTT / Call). Google ask: locate existing HTTPS architecture; report only.

**LAN example (not 172.x):** `192.168.1.38`  
**Lab HTTP today:** `FM_HTTP_PORT=3988` → video WS **3989**, audio WS **3990**

---

## One-screen verdict

| Question | Answer in **this ME8 lab tree** |
|----------|----------------------------------|
| SSL front door (nginx / Traefik / Apache)? | **No** — not present / not running as part of ME8 pack |
| Node.js serving dashboard with TLS certs? | **No** — dashboard is **`http.createServer`** only |
| Correct HTTPS URL for Ops today? | **None configured.** There is **no** lab `https://192.168.1.38:443` dashboard to type |
| Mic on LAN IP over HTTP? | **Blocked by browser** (not secure context) |
| Mic on this PC today? | **`http://localhost:3988`** (or `127.0.0.1`) — already locked in prior disc |
| WSS for 3989 / 3990 if page were HTTPS? | **Not implemented** — client hardcodes **`ws://`**, separate ports, no upgrade path in code |

---

## 1) The SSL front door

**Investigation:**

| Check | Result |
|-------|--------|
| nginx / Traefik / Apache configs in ME8 | **None** found |
| `.pem` / `.crt` / `.key` for dashboard TLS | **None** in tree |
| `server.js` listen path | `const server = http.createServer(app)` → `server.listen(HTTP_PORT, '0.0.0.0')` |
| `https.createServer` for Ops | **Not used** |
| Docs / settings mentioning nginx | **Ship/cloud advice only** (“put nginx in front of operatorUrl”) — **not** wired in this lab |

**Also not the front door:** `FM_HTTPS_UPLOAD_TOKEN` / HTTPS evidence upload API = **token upload feature**, not SSL for the dashboard UI.

**Conclusion:** Today there is **no SSL reverse proxy** and **no Node TLS** for Ops. Plain **HTTP** on **3988**.

---

## 2) The HTTPS URL / port (what to type)

### What exists now (lab)

| URL | Role |
|-----|------|
| `http://localhost:3988` | Ops on **this PC** — mic / PTT / Call **allowed** by browser |
| `http://127.0.0.1:3988` | Same |
| `http://192.168.1.38:3988` | Ops over LAN — page can load; **mic typically blocked** (insecure context) |
| `https://192.168.1.38:443` | **Not provided** by current ME8 stack |

**Exact URL for secure Ops testing today:**  
→ **`http://localhost:3988`** on the Fleet PC (only practical secure-context path without building HTTPS).

**Exact HTTPS network URL:**  
→ **Does not exist yet.** Google’s goal (LAN/domain HTTPS for WebRTC/mic) is a **future architecture**, not a typed URL you can use tonight.

---

## 3) WSS upgrade path (3989 video / 3990 audio / signaling)

### Ports (lab `.env`)

| Port | Service |
|------|---------|
| **3988** | HTTP dashboard + **Socket.IO** (same origin as page) |
| **3989** | Raw **WebSocket** video (JSMpeg / pool) — `WebSocket.Server` on own port |
| **3990** | Raw **WebSocket** live PCM audio — own port |

(Google called 3990 “signaling”; in this tree **3990 = audio WS**. Signaling for Ops is mainly **Socket.IO on 3988**.)

### Client behavior (critical)

`public/js/video-wall.js`:

```javascript
// video ~3989
'ws://' + window.location.hostname + ':' + (port + 1)

// audio ~3990
'ws://' + window.location.hostname + ':' + (port + 2)
```

- Protocol is **hardcoded `ws://`**, not `wss://` and not derived from `location.protocol`.  
- Host follows the page hostname (`localhost` vs `192.168.1.38`).  
- Socket.IO: `io()` → same origin as the page (HTTP today → WS under Socket.IO on **3988**, not 3990).

### If dashboard were HTTPS

| Path | Today’s readiness |
|------|-------------------|
| Socket.IO on 3988 via HTTPS | Would need HTTPS server or proxy terminating TLS on 3988 (or 443→3988) |
| Video **3989** / audio **3990** | Browser would **block `ws://` from an HTTPS page** (mixed content) unless changed to **`wss://`** and TLS terminated on those ports or **proxied under same origin** |
| Current code | **No** wss upgrade / no same-origin `/video-ws` proxy for 3989/3990 |

**Conclusion:** There is **no existing WSS upgrade path** for 3989/3990. HTTPS Ops would require a **named APPLY genre** (proxy + client `wss`/`protocol` fix), not a URL tip.

---

## Architecture sketch (as built)

```
Browser
  │
  ├─ http://HOST:3988  ──► Node http.createServer  + Socket.IO
  ├─ ws://HOST:3989    ──► Node WebSocket (video)     [always ws:// in client]
  └─ ws://HOST:3990    ──► Node WebSocket (audio)     [always ws:// in client]

No nginx/Traefik TLS in front (lab).
```

---

## Operator testing (honest)

| Goal | Use |
|------|-----|
| PTT / Call / mic **now** on this PC | `http://localhost:3988` |
| BWC / WVP / LAN devices | `192.168.1.38` (cams), **not** localhost on the device |
| HTTPS from phone / another PC on LAN | **Not available** until HTTPS+WSS genre is designed and APPLYed |

---

## Link to “WVP/ZLM broke functions”

HTTPS/WSS gap explains **mic/PTT/Call on LAN IP**, not ZLM picture itself.  
Split brain (WVP video vs Fleet voice/SOS) is a **separate** pack issue. This disc only answers Google’s HTTPS/WSS locate ask.

---

## Out of scope (NO APPLY)

- Installing nginx / certs  
- Changing `ws://` → `wss://`  
- Opening 443  
- Any `.env` or `server.js` edit  

---

## One line

> **No SSL front door today — Ops is HTTP :3988. No https://192.168.1.38 dashboard. Mic works on localhost:3988. 3989/3990 are plain ws:// with no WSS path yet.**
