# MOB DISC — Soft Open Chin ~5 min PASS is WVP / ZLM (not Fleet FFmpeg)

**Date:** 2026-07-17  
**Type:** Paper only — verify / lock  
**Operator:** Chin Soft Open + pin PASS, ran ~5 minutes — “check if we are using WVP ZLM”

---

## Verdict

**Yes — Chin Soft Open soak used WVP → modern ZLM HTTP-FLV (`wvp-zlm`), not Fleet JSMpeg / FFmpeg pool.**

| Check | Result |
|-------|--------|
| Broker source | `live broker wvp-zlm primary` · `source: "wvp-zlm"` |
| Play URL host | `uiFlvHost` / `directHost` = **`192.168.1.38:18088`** (WVP ZLM HTTP) |
| Soft Open UI path | `attachCanvasPlayerWvpSoftOpen` → mpegts on FLV (no Fleet INVITE under Soft Open) |
| Stop after soak | `wvp softopen stop bridge` · `tracked: true` · `wvp stopPlay ok` |

---

## Log proof (Chin `…0008`)

**Start (soak):**

```
2026-07-17 18:57:18 … wvp soft play flv urls
  deviceId …0008  directHost 192.168.1.38:18088  proxyUpstreamHost 127.0.0.1:18088

2026-07-17 18:57:18 … live broker wvp-zlm primary
  camId …0008  source wvp-zlm  preferDirect true
  uiFlvHost 192.168.1.38:18088  softTry true
```

**Stop (~5.4 min later — matches ~5 min run):**

```
2026-07-17 19:02:43 … stop-video from dashboard  camId …0008
2026-07-17 19:02:43 … wvp softopen stop bridge  tracked true  softOnly true
2026-07-17 19:02:43 … wvp stopPlay  ok true
2026-07-17 19:02:43 … wvp softopen stop bridge done  ok true
```

No Fleet `invite requested` / pool INVITE needed for this Soft Open path (`mob-softopen-single-invite-path-v1`).

---

## What “WVP ZLM” means here (plain)

```
Chin (GB28181)
  → SIP :5060 (host proxy) → WVP
  → WVP startPlay
  → modern ZLM HTTP-FLV :18088
  → dashboard mpegts Soft Open wall
  → pin mirrors wall <video>
```

| Not used for Soft Open picture | Used |
|--------------------------------|------|
| Fleet `liveStreamPool` INVITE / FFmpeg / JSMpeg wall | WVP play + ZLM FLV + mpegts |
| Fleet ZLM `:8080` (me8-zlm) | WVP modern ZLM **`:18088`** |

Lower resolution = ZLM/WVP stream profile (often substream) — still WVP ZLM.

---

## How to re-check next Soft Open (operator)

1. Soft Open Chin.  
2. Agent/log look for **one line**: `live broker wvp-zlm primary` + `uiFlvHost` …`:18088`.  
3. Browser console may show `[me8-zlm] soft play … 192.168.1.38:18088`.  
4. If you ever see only Fleet WS / JSMpeg with **no** `wvp-zlm primary` → not this path.

---

## Genre status (Soft Open Chin)

| Item | Status |
|------|--------|
| SIP / NAT | PASS |
| Picture wall | PASS (~5 min) |
| Picture pin | PASS |
| Engine = WVP ZLM | **CONFIRMED** |
| Stop → WVP BYE | Log PASS on this soak stop |
| kk | Still secondary / often offline |
| HD / main stream | Parked |

---

## One line

**Chin Soft Open 5‑min PASS = WVP startPlay + ZLM `:18088` FLV (`wvp-zlm primary`) — not Fleet FFmpeg.**
