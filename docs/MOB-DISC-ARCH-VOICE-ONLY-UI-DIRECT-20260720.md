# MOB DISC — ARCH Voice-only UI-direct (CORS / network plan)

**ARCH id:** `MOB-ARCH-VOICE-ONLY-UI-DIRECT`  
**Type:** DISC only — **no APPLY / no code**  
**Date:** 2026-07-20

---

## Boundaries (acknowledged — hard)

| Off-limits | Why |
|------------|-----|
| **Inbound cold SOS** + **wvp-sip-lan-proxy** | Hardware SOS = UDP; proxy+event-bus **PASS** — leave alone |
| **Live video / ZLM / invite lobotomy** | Working — leave alone |
| **FR alerts, redaction, UI layouts** | No rewrite of Fleet business logic outside voice |

**In scope only:** outbound desk→cam **voice** (Group PTT, software Call) for WVP-managed BWCs.

---

## Understanding (confirm)

1. Legacy Fleet cannot route GB28181 talk audio the way gold SIP+29201 did for YDT cams.  
2. Cold SOS and live picture stay on current Master-Gateway / ZLM path.  
3. Voice is **decoupled**: dashboard triggers **WVP native audio REST** (`/api/play/broadcast` or talk), not Fleet SIP INVITE / not “wake then hope 29201”.  
4. Soft PTT today often only hits `ptt-wake-device` (group config noise); real `ptt-start` → WVP fan-out may not complete — ear stays dead.

---

## CORS / network barrier — specific plan

### Fact

| Piece | Typical lab |
|-------|-------------|
| Dashboard origin | `http://192.168.1.38:3988` (or localhost:3988) |
| WVP admin API | `http://127.0.0.1:18080` (host) — often **not** reachable as `127.0.0.1` **from another PC’s browser**; from same PC, **cross-origin** vs :3988 |
| Auth | WVP JWT (admin login) — must **not** live in browser if avoidable |

**Browser `fetch('http://127.0.0.1:18080/api/play/broadcast/...')` will fail** unless:
- page and WVP share origin, **or**
- WVP sends CORS `Access-Control-Allow-Origin` **and** browser can reach that host/port on the operator LAN, **and** JWT is exposed to JS.

### Recommended path (same-origin reverse proxy — preferred)

Do **not** make the browser call WVP:18080 directly for production/lab voice.

Reuse the existing pattern already in Fleet:

- `GET/POST /api/lab/wvp/*` on **:3988** with `requireDashboardAuth`
- Server-side `lib/wvpLabClient.js` already has `startAudioBroadcast` → WVP `/api/play/broadcast/{device}/{channel}`

**ARCH plan for APPLY (later):**

1. **Add thin stateless routes** on UbitronC2 (voice only), e.g.  
   - `POST /api/lab/wvp/broadcast/start` `{ camId }` or `{ camIds: [] }`  
   - `POST /api/lab/wvp/broadcast/stop`  
   - (optional) talk/start-stop if WVP path differs from broadcast  
   Implementation = call existing `wvpLabClient` / `wvpGb28181Bridge` helpers — **no SIP**, **no SOS**, **no play/start video**.

2. **Frontend** (PTT + Call intercept in dashboard JS only — minimal glue, not layout rewrite):  
   - On Group PTT / Call for WVP-managed cams: `fetch('/api/lab/wvp/broadcast/start', { credentials, JSON })` (same origin → **no CORS**).  
   - Stop: matching stop route.  
   - **Do not** emit `ptt-wake-device` / do not rely on `start-bwc-call` SIP path for those cams.  
   - Optional: keep Socket.IO only for UI talk-state LEDs if needed — or drive LEDs from HTTP response.

3. **CORS on WVP itself = fallback only** if someone insists on literal browser→18080; still fails for remote operators who cannot open host Docker port, and leaks WVP JWT. **Not preferred.**

### Network verify checklist (before APPLY smoke)

| Check | Pass means |
|-------|------------|
| Dashboard tab origin is :3988 | Same host as Fleet |
| `POST /api/lab/wvp/broadcast/start` with session cookie → 200 | Proxy works |
| Server log shows WVP broadcast OK (or clear WVP error body) | WVP reached from Node (loopback 18080) |
| Cam ear hears | Product PASS |
| No change to proxy Alarm / SOS | Boundary hold |
| Live open/stop still lobotomy + ZLM | Boundary hold |

Browser DevTools: **no** request to `:18080` if we use same-origin proxy (only `:3988`).

---

## Strip legacy 29201 noise (voice scope)

**Problem:** Fleet still `group config sent` → `host:192.168.1.38` `port:29201` for WVP cams (wake / zlm-watch refresh) — useless/harmful for GB WVP-home audio.

**Plan (APPLY later, gated):**

- When cam is WVP-managed (same gate as invite lobotomy / WVP presence — **not** a new SOS path): **skip** `pushPttGroupForCamera` / `pushPttGroupToDevice` for outbound voice wake.  
- Do **not** touch SOS ack team push unless APPLY explicitly names it (SOS boundary — prefer leave sos-response team alone until separate named MOB).  
- Default APPLY scope: **operator PTT wake + zlm-watch group refresh** for WVP cams only.

---

## What we will **not** do in this ARCH

- Touch `scripts/wvp-sip-lan-proxy.js` or event-bus Alarm  
- Touch video-wall live attach / lobotomy / ZLM watch beyond PTT/Call click handlers  
- Rewrite FR / redaction / map layouts  
- Re-enable Fleet SIP INVITE for talk or video  

---

## Suggested APPLY name (when you order it)

`MOB-APPLY-VOICE-ONLY-UI-DIRECT`

Suggested order inside that APPLY:

1. Lab routes: broadcast start/stop (proxy) + smoke via curl with session  
2. Frontend: PTT + Call → those routes; suppress wake for WVP cams  
3. Gate: skip 29201 group push for WVP cams on wake/refresh  
4. Operator smoke: cold SOS untouched; live untouched; soft PTT + Call ear test  

---

## Residual risks (honest)

- WVP `broadcast` vs `talk` API semantics / codec may still need one lab tweak after proxy exists.  
- Mic capture: if Call needs browser PCM to WVP, HTTP “start broadcast” alone may open cam speaker path only — may need second MOB for media upload WebRTC/WS. First APPLY = prove REST start/stop + no CORS + no 29201 noise.  
- Soft Open / hybrid cams still on Fleet gold: keep 29201 for **non**-WVP ids.

**No code in this DISC.** Await `MOB-APPLY-VOICE-ONLY-UI-DIRECT` (or renamed).
