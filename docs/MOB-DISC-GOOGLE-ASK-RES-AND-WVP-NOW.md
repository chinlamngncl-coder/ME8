# MOB DISC — Ask Google: resolution FAIL + why WVP not “now” (honest)

**Status:** PAPER 2026-07-17 ~00:14  
**Search:** `ask google resolution`, `why not wvp`, `relay google`, `0x0`, `未找到可用的zlm`  
**Audience:** Operator pastes **Section A** to Google. Section B = why Cursor deferred WVP push.  
**5060:** Fleet SIP stays — never rewrite as homework.

---

## Section A — COPY TO GOOGLE (problem)

### Title
ME8 soft live: Fleet MPEG-TS → openh264 → ZLM still `Invalid frame dimensions 0x0`; WVP `startPlay` still “no available ZLM”

### Goal
Stable panel resolution (follow device 4K / 1080 / whatever — **no hardcode**). Prefer **WVP → ZLM → FLV** (Plan A). Plan B (Fleet pool re-encode) is fail-open only and is **not** good enough for resolution.

### Stack (facts)
- App / Fleet SIP: **5060** (must stay for daily ops)
- WVP lab API: `http://127.0.0.1:18080` (login OK)
- ZLM ingest: `rtmp://127.0.0.1:19350/live/<camId>` (side ZLM; host health OK enough to publish)
- Soft path after WVP miss: Fleet live pool **WebSocket MPEG-TS** (`mpeg1`/`mpeg2` for JSMpeg) → ffmpeg **`libopenh264`** → RTMP publish → ZLM → wall FLV overlay
- LGPL ffmpeg: **no libx264** (already switched to openh264). Blind `-c:v copy` from this WS is wrong codec for FLV (not clean H.264)

### What already failed (do not suggest again)
1. Prime buffer + larger probesize / analyzeduration  
2. `-vf scale=trunc(iw/2)*2:trunc(ih/2)*2`  
3. Probe primed TS → lock `-vf scale=W:H` from probe (**got 640×480** = **pool** size, not camera native)  
→ Still: `[mpeg2video] Invalid frame dimensions 0x0` **before** scale helps

### Exact log lines (2026-07-17 ~00:08)
```
wvp login ok | base http://127.0.0.1:18080
wvp startPlay retry after stack clean | first: 未找到可用的zlm  (log may show as ??????zlm)
live broker fallback | reason: wvp_startplay_failure
zlm relay ffmpeg spawned | geometry: fixed-from-probe-v1 | outWidth:640 | outHeight:480
zlm relay ffmpeg | [mpeg2video] Invalid frame dimensions 0x0.
live broker zlm-relay primary | after: wvp_miss
```

Same pattern for cams `…0008` and `…0009`. Soft path stays `zlm-relay primary`. **`wvp-zlm primary` = 0**.

### Ask Google (answer these)
1. **Plan A (preferred):** WVP login OK, secret/mediaServerId were matched earlier, ZLM HTTP OK from host, but `startPlay` still returns **未找到可用的zlm**. What exact WVP/ZLM check proves “media server available” (online flag, hook URL to WVP, mediaServerId string, channel register)? Steps that do **not** require moving Fleet off **5060**.  
2. After Plan A works: will wall FLV come from **device/GB H.264** (native res) so we can **drop** Plan B re-encode for panel quality?  
3. **Plan B (only if Plan A blocked):** Pool WS is mpeg1/mpeg2 for JSMpeg. Re-encode to FLV with libopenh264 still gets **0x0** after 300KB+ prime and fixed scale from probe. Is this path **fundamentally unsuitable** for stable resolution? If not, what ffmpeg args discard bad packets **without** hardcoding 720/1080/4K?  
4. Do **not** recommend `-c:v copy` on this MPEG-TS pool unless you show the stream is already H.264 Annex-B suitable for FLV.

### Constraints for Google
- Do not tell us to change daily Fleet SIP **5060**  
- Do not hardcode output to 1280×720 / 1920×1080 — device may be 4K or 1080  
- Operator is not tech — give **agent-checkable** WVP/ZLM API or config facts, not vague “check Docker”

---

## Section B — Why Cursor did not “do WVP now” (honest)

| Not because | Because |
|-------------|---------|
| WVP is wrong architecture | WVP **Plan A is the right** quality/res path |
| We hate WVP | Every soft open already **calls WVP `startPlay` first** |
| Geometry MOB replaces WVP | Geometry was a **wrong bet** for res — proved FAIL |

**Real reason we deferred “push WVP harder” tonight:**

1. **WVP already runs first** — log: `wvp_startplay_failure` → `未找到可用的zlm` → then fail-open Plan B.  
2. Without WVP listing ZLM as **available**, more app code / more APPLY on broker **cannot invent** `wvp-zlm primary`. That is **media-server online / hook / register**, not another wall player tweak.  
3. Soft ZLM relay kept ops picture (not black) while Plan A dead — but it **cannot** fix resolution (mpeg pool + 0x0).  
4. Agent should have said earlier: **stop geometry MOBs; ask Google for Plan A media-online** — not more probe/scale paper.

**So:** Not “don’t want WVP.” Want WVP — **blocked on “no available ZLM”**. Need Google (or a named media-online MOB with their exact checklist) to unblock Plan A.

---

## Section C — What we want after Google replies

| If Google gives | Named work (you say MOB-APPLY) |
|-----------------|--------------------------------|
| Exact WVP/ZLM online/hook fix | `mob-wvp-zlm-media-online-v1` |
| Then TCP Passive on WVP play only | `mob-wvp-play-tcp-passive-v1` (not Fleet 5060) |
| Plan B is dead for quality | Park soft-relay for panel quality; keep fail-open or drop overlay |

---

## One line

**Problem for Google: Plan A startPlay = 未找到可用的zlm; Plan B openh264 from mpeg pool = still 0x0 / bad res. We want Plan A, not more geometry. 5060 stays.**
