# ME8 — ZLM live media sidecar (plan)

**MOB:** `mob-me8-zlm-plan-doc`, `mob-me8-zlm-plan-doc-amend-failover`  
**Status:** Plan locked — implementation MOBs follow in order below  
**Tree:** `C:\Users\user\Desktop\Enterprise Mobility\ME8`  
**Problem:** Chinese GB28181 live path (RTP/PS → per-cam **ffmpeg** → **JSMpeg**) is unstable at scale.  
**Goal:** **ZLMediaKit (ZLM) sidecar** on the same dispatch server — Fleet keeps SIP/SOS/PTT; ZLM owns media ingest and restream. **ffmpeg remains invisible break-glass fallback** — not the product path.

---

## Production policy (amended — before ship)

| Rule | Value |
|------|--------|
| **Primary engine** | **ZLM** — every Start live tries ZLM first |
| **Fallback** | **ffmpeg + JSMpeg** — automatic, silent, per cam |
| **Operator / partner** | **Never** choose engine — no UI, no docs |
| **Ship SKU** | `zlm-primary-ffmpeg-fallback` baked into BUILD |
| **Emergency only** | Ship desk may set ffmpeg-only for rollback — not normal SKU |

**ffmpeg is a spare tire**, not the default product. Ubitron keeps it so a rare ZLM edge case does not blank the wall — operators should not feel or name it.

---

## Who switches what? (read this first)

| Role | Touches engine? | How it works |
|------|-----------------|--------------|
| **Operator / dispatch** | **Never** | Start live / stop — same as today |
| **Site admin (Settings)** | **Never** | No engine toggle |
| **Partner installer** | **Never** | `SETUP-ME8.bat` — pack already configured |
| **Ubitron ship desk** | **BUILD only** | Records `liveEngine: zlm-primary-ffmpeg-fallback` in ship record |
| **Ubitron engineering** | **Lab / emergency** | Bench tests; emergency ffmpeg-only rollback flag |

### Automatic vs manual — plain answer

**Every Start live:** Fleet tries **ZLM** → if process sick, stream not ready, or mid-stream stall → **ffmpeg for that cam** (logged) → operator sees at most **Connecting…**, not “legacy mode.”

**No per-session manual switch.** No operator training. No partner checklist item.

```
Production (after MOB 6 ship default)
  FM_LIVE_ENGINE=zlm
  FM_LIVE_FALLBACK_FFMPEG=1
  → ZLM primary on every Start live
  → ffmpeg only when failover rules fire
  → circuit breaker may bias new streams to ffmpeg if ZLM site-unhealthy (logged)

Emergency rollback (ship desk only)
  FM_LIVE_ENGINE=ffmpeg + FM_LIVE_FALLBACK_FFMPEG=0
  → entire site on old path until next upgrade pack
```

---

## Architecture

### Core constraint — one SIP INVITE, swappable backend

If RTP is sent **directly to ZLM in SDP**, failover requires re-INVITE → BWC glitch on Chinese GB devices.

**Design:** Fleet keeps **single RTP landing** (today’s port model); media engine is a **pluggable adapter**.

```
Operators ──► Fleet :3988 (login, map, wall, SOS, PTT)
                    │
                    │ SIP INVITE / BYE (unchanged)
                    ▼
              BWC ── RTP/PS ──► Fleet RTP landing (one session)
                                    │
                         ┌──────────┴──────────┐
                         ▼                     ▼
                  ZLM adapter (primary)   ffmpeg adapter (fallback)
                         │                     │
                         ▼                     ▼
                  FLV / HLS play URL      JSMpeg WS :3989
                         └──────────┬──────────┘
                                    ▼
                           Wall + map pin (auto player pick)
```

| Component | Owner | MVP change |
|-----------|--------|------------|
| SIP INVITE / BYE / SOS reinvite | Fleet | **Minimal** |
| RTP landing + **LiveMediaRouter** | Fleet (`lib/liveMediaRouter.js` — new) | **New** |
| ZLM ingest / restream | ZLM sidecar | **New** |
| ffmpeg + JSMpeg | `liveStreamPool` (fallback adapter) | **Kept** |
| Viewer ref-count, 8-BWC cap | Fleet | **None** |
| Wall player | `video-wall.js` (locked MOBs) | Unified `video-stream-ready` |
| PTT / G711 | Fleet | **Unchanged** |

**Out of scope:** ZLM merged into `server.js`, WVP UI, multi-node cluster, customer-facing engine toggle.

---

## Invisible failover — five layers (required before ship)

### Layer 1 — Process health (ZLM alive?)

| Check | Interval | Action |
|-------|----------|--------|
| ZLM HTTP/API (e.g. `getServerConfig`) | 10–30 s | If down → **new** live sessions use ffmpeg until ZLM OK |
| ZLM recovery | — | **New** sessions try ZLM again; do not mass-migrate active tiles mid-stream in v1 |

Internal platform health only — **not** operator banner.

### Layer 2 — Stream readiness (startup window)

After INVITE + RTP flowing, wait **6–10 s** (`FM_LIVE_ZLM_START_TIMEOUT_MS`):

| Signal | Action |
|--------|--------|
| ZLM stream registered + bytes / keyframe | **ZLM path** → `video-stream-ready` with ZLM `playUrl` |
| Timeout or publish failure | **Failover** → ffmpeg adapter on **same RTP feed** → JSMpeg path |

Operator: one Start live; wall may spin slightly longer once.

### Layer 3 — Mid-stream stall watch

While live on ZLM:

| Signal | Action |
|--------|--------|
| No frames / ZLM stream dropped ≥ N s | In-session failover to ffmpeg (same RTP landing) |
| ffmpeg also fails | Existing wall reconnect UX |

**Anti-flap:** max **1 failover per cam per 5 min** (`FM_LIVE_FAILOVER_COOLDOWN_MS`); then hold ffmpeg until stream stops and restarts.

### Layer 4 — Site circuit breaker (Ubitron telemetry)

| Condition | Behaviour |
|-----------|-----------|
| ZLM readiness fails on **>50%** of starts in 15 min | Temporary bias: **new streams prefer ffmpeg** (logged) |
| ZLM stable again | Auto-return to ZLM primary |

Review fallback rate in `fleet.log` before `me8-v1` lock — high rate blocks ship.

### Layer 5 — Wall player abstraction

Extend `video-stream-ready` (Fleet → wall):

```json
{ "camId": "…", "engine": "zlm", "playUrl": "http://127.0.0.1:…/live/….flv" }
{ "camId": "…", "engine": "ffmpeg", "playUrl": "ws://host:3989/…" }
```

Wall picks player **automatically** — pin uses same event. **No engine name in UI.**

---

## Engine flags (internal bootstrap)

| Key | Production ship value | Behaviour |
|-----|----------------------|-----------|
| `FM_LIVE_ENGINE` | **`zlm`** | Primary — try ZLM on every Start live |
| `FM_LIVE_FALLBACK_FFMPEG` | **`1`** | Enable invisible ffmpeg fallback (required for customer packs) |
| `FM_ZLM_HTTP_URL` | e.g. `http://127.0.0.1:8080` | ZLM API base |
| `FM_ZLM_SECRET` | optional | API secret if enabled |
| `FM_LIVE_ZLM_START_TIMEOUT_MS` | `8000` | Readiness window before failover |
| `FM_LIVE_FAILOVER_COOLDOWN_MS` | `300000` | Anti-flap per cam |
| `FM_LIVE_STALL_TIMEOUT_MS` | e.g. `5000` | Mid-stream stall before failover |

**Emergency rollback (ship desk only):**

| Key | Value |
|-----|--------|
| `FM_LIVE_ENGINE` | `ffmpeg` |
| `FM_LIVE_FALLBACK_FFMPEG` | `0` |

Ship record (`storage/customer-ship-record.json`):

```json
"liveEngine": "zlm-primary-ffmpeg-fallback"
```

---

## Sidecar process (same box)

| Item | MVP choice |
|------|------------|
| Run mode | Windows ZLM binary beside Fleet **or** compose on lab |
| Start | Internal — with Fleet via ship desk start (not operator step) |
| Health | Layer 1 probes before ZLM primary on new streams |
| Ports | MOB 2 — localhost API; documented separately from `:3988` |

**Weight:** one ZLM process vs **N ffmpeg** at 8 streams — expect **lower** total CPU/RAM on ZLM primary. **One active backend per cam per session** — never 8×ffmpeg **and** 8×ZLM for the same cam.

---

## Implementation MOBs (order — one at a time)

| # | MOB | Deliverable |
|---|-----|-------------|
| 1 | `mob-me8-zlm-plan-doc` | This file |
| 2 | `mob-me8-zlm-plan-doc-amend-failover` | Failover policy, MOB order, PASS F1–F6 |
| 3 | `mob-me8-zlm-sidecar` | **Done** — `lib/zlmSidecar.js`, start/verify scripts, docker compose, platform status |
| 4 | `mob-me8-zlm-ingest-bridge` | **Done** — `liveMediaRouter`, `zlmIngestAdapter`, RTP mirror to ZLM |
| 5 | **`mob-me8-zlm-failover`** | **Done** — readiness timeout, stall watch, circuit breaker, silent ffmpeg fallback logs |
| 6 | `mob-me8-zlm-wall-mvp` | **Done** — unified `video-stream-ready` + dual player; Chin/kk 1 cam |
| 7 | `mob-me8-zlm-scale-8` | **Done** — cap aligned to 8; [ME8-ZLM-SCALE-8-CHECKLIST.md](./ME8-ZLM-SCALE-8-CHECKLIST.md) |
| 8 | Ship default | BUILD = `zlm-primary-ffmpeg-fallback` after PASS |

**Locked files:** `video-wall.js`, `ptt-rx.js`, `sipServer.js`, `pttServer.js` — MOBs 5–7 only, minimal diff.

---

## Player path (MVP)

| Phase | Player | Role |
|-------|--------|------|
| **MVP A** | HTTP-FLV or HLS from ZLM | Primary playback |
| **MVP B** (follow-up) | WebRTC from ZLM | Lower latency — after A PASS |
| **Fallback** | JSMpeg `:3989` | ffmpeg adapter only — invisible |

---

## Migration playbook (your team)

### Lab bench

1. Set `FM_LIVE_ENGINE=zlm` + `FM_LIVE_FALLBACK_FFMPEG=1`.  
2. Run MOBs 3→7; test Chin/kk + **failover drills (F1–F3)**.  
3. Record PASS + fallback rate in MOB log.  
4. Emergency: ffmpeg-only flags — no reinstall.

### New customer (after MOB 7 PASS)

1. BUILD defaults `liveEngine: zlm-primary-ffmpeg-fallback`.  
2. Partner: `SETUP-ME8.bat` — Fleet + ZLM start internally.  
3. Handoff sheet unchanged — operators same URL, same Start live.

### Existing site upgrade

1. Upgrade pack with ZLM + fallback flags.  
2. Partner maintenance window → `SETUP-ME8.bat`.  
3. Site admin verifies wall once — no operator engine training.

---

## PASS gates

### ZLM core

| Gate | Check |
|------|--------|
| Z1 | ZLM sidecar starts; health API OK |
| Z2 | One lab BWC via ZLM ≥ 15 min, no black-loop |
| Z3 | Pin + wall same stream; stop/start clean |
| Z4 | 8 concurrent ZLM streams |
| Z5 | SOS live + reinvite (SIP unchanged) |
| Z6 | PTT unaffected |
| Z7 | Emergency ffmpeg-only rollback < 5 min |

### Failover (required before ship — MOB 5)

| Gate | Check |
|------|--------|
| F1 | Stop ZLM → Start live → **ffmpeg picture** without operator action |
| F2 | ZLM up but block publish → **failover within timeout** |
| F3 | Kill ZLM mid-stream → **reconnect or failover ≤ 5 s** |
| F4 | 8 ZLM streams stable 30 min |
| F5 | Chin/kk GB soak — fallback rate acceptable (Ubitron sets threshold after bench week) |
| F6 | Failover events in `fleet.log` — **not** shown in operator UI |

**Ship blocker:** F1–F3 + Z4 must PASS before BUILD default flip (MOB 8).

---

## Commercial boundary

| Audience | Sees |
|----------|------|
| Operator | Start live / stop — **no engine name** |
| Partner | `SETUP-ME8.bat` only |
| Ship desk | `liveEngine` in BUILD + fallback telemetry |
| Customer IT | No ZLM appendix v1 (localhost-only) |

---

## Relationship to other work

| Item | Relation |
|------|----------|
| AES256 vault | **Done** — unrelated |
| TLS handoff | Operators use handoff URL; ZLM on LAN behind Fleet |
| Valkey/Postgres | **Later** |
| ffmpeg retirement | **After** one release on ZLM primary + low fallback rate — named MOB only |

---

## Decision log

| Question | Decision |
|----------|----------|
| Sidecar or merge into server.js? | **Sidecar** |
| Default engine? | **ZLM** (not ffmpeg) |
| Failover before ship? | **Yes** — MOB 5, PASS F1–F3 |
| Who switches? | **Automatic** — operators never |
| Manual per session? | **No** |
| RTP model? | **Fleet landing** — one INVITE, swappable adapter |
| Mask ZLM bugs via fallback? | Monitor fallback rate — ship desk review |
| Build now? | **Yes** |

---

## Risks

| Risk | Mitigation |
|------|------------|
| High silent fallback rate hides ZLM issues | Log + ship gate F5; review before `me8-v1` |
| ZLM ↔ ffmpeg flapping | Cooldown + circuit breaker |
| 2× CPU | One backend per cam per session |
| Wall complexity | Single `video-stream-ready` contract |

---

**Next MOB:** BUILD default `zlm-primary-ffmpeg-fallback` after scale-8 CHECKPOINT PASS

**Wall MVP (MOB 6):** **Done** — unified `video-stream-ready` with `engine` + `playUrl`; ZLM HTTP-FLV via `/api/live/flv`; ffmpeg JSMpeg fallback unchanged.

**Sidecar setup:** [ME8-ZLM-SIDECAR-SETUP.md](./ME8-ZLM-SIDECAR-SETUP.md)
