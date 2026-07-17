# MOB DISC — Face-follow redaction · software map · **SHIP GATE**

**Status:** Tier-2 **APPLIED** 2026-07-16 — `mob-evidence-redact-face-follow-v1`  
**Applied doc:** `docs/MOB-APPLIED-EVIDENCE-REDACT-FACE-FOLLOW-V1.md`  
**Date:** 2026-07-14 (disc) / 2026-07-16 (apply)  
**Search:** `redaction ship gate`, `face follow`, `deface`, `脱敏`, `before ship`

**Operator:** improve follow-the-face blur; research more software; **must do before ship — no excuses.**  
**Lab note 2026-07-16:** Static YuNet→FFmpeg union boxes already FAIL (blur everything). Do not re-soak that path. Burn is now per-frame face-follow.

---

## SHIP GATE (locked — no excuses)

| Rule | Detail |
|------|--------|
| **Before customer ship** | Evidence redaction must **follow the face** well enough for demo + tender (Tier **2** PASS) |
| **Not optional** | Sticky FFmpeg boxes alone = **not ship-ready** for privacy story |
| **When packing** | Packing checklist must tick: **face-follow redact PASS** (lab clip + operator review + sealed original) |
| **Not a daily nag** | Remind at **ship / pack / packing checklist** time — same discipline as other ship gates |
| **Order** | Can run in parallel with Track B scale work; **does not wait** for WVP wall |

**Pass criteria (plain):**  
One real BWC clip → auto face suggest → blur **moves with face** → operator accepts → `*_redacted.mp4` saved → original untouched → audit logged.

If that fails → **do not ship** that build as “enterprise redact done.”

---

## Improve path (locked)

| Tier | What | Ship? |
|------|------|--------|
| **1 — Small** | More / tighter static boxes (same FFmpeg) | Warm-up only — **not** enough alone |
| **2 — Real fix** | Detect + **tracker** + **blur each frame** then mux audio | **Required before ship** |
| **3 — Big tender** | Dedicated blur box / live share anonymize | After ship if tender needs live 脱敏 |

---

## What we have now (after face-follow-v1)

| Path | Behavior |
|------|----------|
| **Auto face-follow + Save** | Per-frame detect + IoU hold + tight ROI blur (OpenCV sidecar), then mux audio |
| **Manual-only Save** | Legacy static FFmpeg boxes (still available) |
| **Legacy autoface→static merge** | **Retired for suggest** — preview uses tight samples; burn does not use union boxes |

**2026-07-16:** Auto detect/burn default = **Seeta** (`mob-evidence-redact-seeta-detect-v1`). YuNet Auto parked (`FM_REDACT_FACE_ENGINE=yunet` only).

---

## Software / approach map (researched)

### A — Open source (learn / adapt in-process — prefer for pack control)

| Name | What it does | Fit for us |
|------|----------------|------------|
| **deface** (ORB-HD) | Per-frame face detect + blur/black box; CLI | Closest simple “follow” burn; study pipeline |
| **FaceShield** | MediaPipe + **DeepSORT** track; web review; CSRT manual regions | **Best OSS pattern** for review + follow |
| **video-anonimyzer** | YOLO + **ByteTrack**; temporal smooth; review UI | Strong tracker; heavier deps |
| **blurfaces** | InsightFace + modes (all / one / exclude) | Good if we need “blur everyone but subject” |
| **blurface** (PyPI) | YOLOv8-face GPU; metrics | Fast lab if CUDA available |
| **Our YuNet sidecar** | Already in tree | Keep as light detector; upgrade **burn** to per-frame |

**Direction:** Tier 2 = **our** Evidence Hub UI + sidecar burn inspired by FaceShield/deface (per-frame + tracker), **not** force customers to install a separate app.

### B — Enterprise / commercial (reference; buy only if tender forces)

| Name | Notes |
|------|--------|
| **Secure Redact**, **VIDIZMO**, **BlurMe**, **Visylix** | Face+plate track, FOIA/GDPR story, SaaS or on-prem |
| **Isarsoft** etc. | Live anonymize analytics |
| **CN 脱敏网关** (e.g. face+plate mosaic boxes) | Same Tier 3 class — live/share gateway |

Use these for **feature checklist** (face+plate, audit, irreversible burn, review). Default ship path stays **in-product**, not cloud upload.

### C — Cloud APIs (usually avoid for BWC evidence)

Aliyun IMM / similar — fine for some CN clouds; **bad default** for our evidence sovereignty story unless customer demands it.

---

## Locked product rules

- Evidence Hub only first — **not** live wall / SIP / PTT  
- Auto = **suggest**; human **review** before burn  
- Original sealed; redacted = derivative + audit  
- Ship pack: bundle runtime (venv/models) — no “operator downloads Python from internet”  
- Brand: Ubitron UI only  

---

## Apply order

1. `mob-evidence-redact-tighter-boxes` — Tier 1 (optional warm-up) — **skipped** (operator: static YuNet already FAIL)  
2. **`mob-evidence-redact-face-follow-v1`** — Tier 2 (**SHIP GATE**) — **APPLIED 2026-07-16**  
3. Later tender: `mob-evidence-redact-live-gateway` — Tier 3  

Packing checklist line to add when packing MOB runs:

```
[ ] Face-follow redact Tier-2 PASS (clip + review + sealed original)
```

---

## Related

- Earlier follow DISC: this file supersedes soft “pick later” tone  
- In-app flow: `docs/MOB-DISC-EVIDENCE-REDACT-IN-APP.md`  
- Code today: `lib/faceRedactRegions.js`, `redaction-track/`, `lib/faceTrackSidecar.js`
