# MOB DISC — Go back to written smooth method (Firmware Gold + WVP/ZLM handoff)

**Status:** DISCUSS ONLY — wait for `MOB-APPLY …`  
**Operator:** Check what’s written (Firmware Gold + when WVP/ZLM started). That is the method. Stop inventing chase. Want smooth again.

---

## What is written (the method)

### 1) Firmware Gold — pin / Ops ownership (2026-07-06) — LOCKED

Sources: `BASELINE-ME8-FIRMWARE-GOLD.md`, `docs/ME8-FIRMWARE-GOLD-LOCKED.md`, `docs/MOB-DISC-FIRMWARE-GOLD-PIN-MIRROR.md`

| Lock | Meaning |
|------|---------|
| One stream owner per cam | **Wall owns** the live player |
| Pin | **`startMapMirrorFromWall`** — mirror wall picture (canvas / later wall `<video>`). **No second player on pin** |
| Forbidden | Dual pin JSMpeg, strip `map-pin-mirror-canvas`, player storms |
| Restore | User only: `RUN RESTORE-ME8-FIRMWARE-GOLD` |

Gold era wall player was classic Fleet JSMpeg; **pin rule stayed when WVP arrived**.

### 2) WVP/ZLM handoff — how live video is supposed to work (from ~2026-07-20)

Sources: `docs/MOB-DISC-WVP-HARM-100-CONSOLIDATION-FIX-PLAN-20260720.md`, APPLIED FLV handoff MOBs, `MOB-APPLIED-BACKEND-VIDEO-UI-FLV-ON-READY-V1`

When `FM_WVP_VIDEO_HANDOFF=1`:

```text
start-video
  → WVP startPlay (not Fleet SIP INVITE)
  → browser flvUrl (ZLM :18088)
  → Me8LivePlayerFactory.attachFlvPrimary(host, flvUrl)
  → mpegts FLV on <video>  (hasAudio:false)
  → pin = mirror that wall <video>  (PIN-FLV-MIRROR / Gold rule)
```

**Same factory pattern** for Ops wall, Command Wall, FR, panel popout — written phases in WVP harm consolidation. **WVP/ZLM stays. No park. No new stack.**

### 3) Smooth / latency — what PASSed (written)

| Doc | Fact |
|-----|------|
| `MOB-DISC-ZLM-WVP-LATENCY-PASS-20260729.md` | Operator: ZLM/WVP latency **PASS / CLOSED** |
| Parked / forbidden | Hard mpegts `liveBufferLatencyChasing` / stash-off experiments that caused **minutes** lag |
| Lab Gate B note | Proxy ~8–10s historic; **do not** reopen with player buffer hacks |

The **smooth PASS path** was: plain `attachFlvPrimary` (mpegts FLV, chase OFF) + pin mirror. **Not** a singleton soft-chase engine.

---

## What broke smoothness (tonight)

`AxiomFlvManager` was injected under `attachFlvPrimary` and added **1s soft-chase** (1.05× / seek). That is **not** in Firmware Gold and **not** in the WVP handoff APPLIED method. It jerks every panel that uses the factory — and pin jerks because it **mirrors** the wall video.

---

## Risk pick (one — matches the written method)

| Option | Verdict |
|--------|---------|
| **A. Restore WVP-handoff `attachFlvPrimary` behavior** — plain mpegts attach like APPLIED FLV-ON-READY / wall PASS; **soft-chase OFF**; pin stays Gold mirror; WVP handoff stays ON | **RECOMMENDED** |
| B. Keep Axiom chase, “tune thresholds” | Reject — fights the written PASS path |
| C. Full `RUN RESTORE-ME8-FIRMWARE-GOLD` | Nuclear — only if user types that phrase; rolls more than video chase |

### `RESTORE-WVP-FLV-ATTACH-SMOOTH-V1`

**Scope (small):**

1. `shared-flv-player.js` / factory — **no soft-chase by default** (or factory attaches like pre-Axiom: `liveBufferLatencyChasing: false`, no rate/seek loop).  
2. Keep handoff: still `flvUrl` → `attachFlvPrimary`.  
3. **Do not touch** `video-wall.js` pin mirror / Gold cores.  
4. No new architecture.

**PASS:** Ops wall + pin smooth again (same feel as WVP handoff PASS era).

---

## Operator next

Say: **`MOB-APPLY RESTORE-WVP-FLV-ATTACH-SMOOTH-V1`**
