# MOB DISC — Google four checks vs our failed ZLM MOB (paper only)

**Status:** DISC locked 2026-07-16 — **no APPLY**  
**Search:** `google wvp zlm`, `network_mode host`, `tcp passive`, `webhook secret`, `strict api`  
**Source:** Operator paste — “Fixing the WVP & ZLM Blackout Issues (Moving away from FFmpeg)”  
**Failed MOB check:** `docs/MOB-DISC-WVP-ZLM-FIRST-REGRESS-NO-VIDEO.md` + revert  
**Bring-up ladder:** `docs/MOB-DISC-WVP-STARTPLAY-HOW-NOT-MIRACLE.md`  
**5060:** unchanged — `docs/MOB-DISC-NO-DICTATE-CHANGE-5060.md`

---

## What the last failed MOB actually was

| Item | Fact |
|------|------|
| Name | `mob-wvp-*-zlm-before-ffmpeg-invite` (wall + pin) |
| Mistake | Held **Fleet INVITE** while WVP `startPlay` failed (retries) → **black panel/pin** |
| Not the root | Docker bridge “thousands of streams” — we failed at **1–2 cams**, not scale |
| Log | `wvp_startplay_failure` / SSRC · **0** × `wvp-zlm primary` |
| Fix done | **Revert** — ops FFmpeg invite immediate again |
| Lesson | Do not block ops on a dead `startPlay`. Stack must PASS in lab first (W1–W4). |

Google’s note is about **scale blackouts**. Our last FAIL was **product invite-order + startPlay dead** — different layer. Still useful as a **stack checklist** for the next bring-up MOB.

---

## Four Google points × ME8 lab (honest)

### 1) Docker `network_mode: host` (UDP/TCP media)

| Google says | Our lab now |
|-------------|-------------|
| ZLM in Docker should use `network_mode: host` or bridge NAT drops media | `docker/wvp/docker-compose.wvp.yml`: **bridge + published ports** (`80`, `10000`, `30000-30100` tcp/udp). **No** `network_mode: host` |

**Verdict:** Valid for **high concurrency**. Not proven as tonight’s root (fail at play invite / SSRC before fan-out).  
**Next MOB candidate:** `mob-wvp-zlm-docker-host-net-v1` — try host net on Windows carefully (Docker Desktop host mode ≠ Linux). Paper until APPLY.

---

### 2) GB28181 TCP (Passive) instead of UDP

| Google says | Our lab now |
|-------------|-------------|
| Force TCP Passive under load | Fleet FFmpeg path often **UDP** invite; WVP play path separate (5061). Cam TCP Passive = **cam + WVP** setting — agent must not dictate Fleet **5060** rewrite |

**Verdict:** Good for **stable WVP play** once devices answer WVP.  
**Conflict risk:** Telling operator “change all cams to TCP Passive / leave 5060” = forbidden lecture.  
**Path:** Lab prove on **WVP 5061** play with TCP Passive **without** forcing daily Fleet 5060 off. Fits W3 (optional one lab cam) in startPlay-how disc.

---

### 3) Align webhooks + secrets (WVP ↔ ZLM)

| Google says | Our modern split stack |
|-------------|------------------------|
| `secret` match | `application-modern.yml` secret = `me8WvpZlmModern20260714Kx9m` · `zlm-modern/config.ini` same |
| `mediaServerId` match | ZLM `mediaServerId=me8-zlm-modern` · WVP modern yml must match (comment in compose README) |
| Hooks to WVP | Modern ZLM hooks → `http://me8-wvp:18080/index/hook/...` (container DNS) — **not** `127.0.0.1` from ZLM’s view |

**Verdict:** Modern compose **aims** to match. Stale fossil/bundled ini (`zlm-bundled` different secret/id) must **not** be the running volume — running volume is `./zlm-modern/config.ini`.  
**Agent check in next stack MOB:** dump live WVP media-server row + ZLM `getServerConfig` — confirm secret/id/hook — fix drift. That is **W2** work, not hope.

SSRC / “stream already exists” in logs = often **RTP session hygiene**, which sits next to this sync story.

---

### 4) Strict API — app → WVP only, not ZLM

| Google says | Our code |
|-------------|----------|
| Call WVP `/api/play/start` only | **Primary path:** `wvpLabClient.startPlay` → WVP REST — correct |
| Take FLV/WebRTC URL from WVP | Broker builds descriptor from WVP FLV / proxy — correct intent |
| Do not talk to ZLM directly | **Also** still have `zlmIngestLab` / Gate-B relay paths for older lab ZLM — parallel track, not the WVP-primary story |

**Verdict:** WVP-primary architecture matches Google. Last FAIL was not “app called ZLM wrong” — it was **startPlay failed** then UI waited.  
**Keep:** Fleet ops must not depend on long WVP probe before invite (already reverted).

---

## Map Google → our bring-up ladder

| Google # | Maps to | Named work (when you APPLY) |
|----------|---------|-----------------------------|
| 3 + SSRC/RTP | **W2** stack | `mob-wvp-startplay-stack-fix-v1` |
| 1 host net | W2 optional / scale | `mob-wvp-zlm-docker-host-net-v1` |
| 2 TCP Passive | W3 lab cam / WVP setting | only with your yes — no 5060 dictate |
| 4 strict API | already mostly true | keep; don’t re-open ZLM-direct as primary |

Ops ZLM wire = **W5** after W4 proof — fail-open &lt;2s — never repeat invite-defer blackout.

---

## What we will **not** do from this paste alone

- Blind `network_mode: host` tonight without APPLY  
- Order you to move whole fleet off **5060**  
- Another “ZLM before invite” on ops while startPlay dead  
- Sell FFmpeg soak as WVP-ZLM  

---

## One line

**Google four checks = good stack checklist. Last FAIL = invite-defer on dead startPlay, not “Docker scale yet.” Next work = W2 secret/hook/RTP + prove `wvp-zlm primary`; host-net/TCP Passive only as named MOBs with your APPLY.**
