# MOB DISC — FLV live vs ffmpeg: what we changed (and what still uses ffmpeg)

**Date:** 2026-08-03  
**Status:** DISCUSSION ONLY — clarify product facts (no APPLY)  
**Trigger:** “ffmpeg FLV? I thought we changed everything to FLV and ffmpeg is backup?”

---

## Straight answer

**Live video you watch = FLV (browser mpegts), not ffmpeg.**  
**ffmpeg is still used on the server** to **snap one JPEG** from that same FLV (or classic mpeg1) for FR / ANPR / analytics. That is **not** the live player, and it is **not** “we went back to ffmpeg video.”

So: your memory is **half right**. Player path = FLV primary. ffmpeg was **never** the Ops/ANPR **tile player**; it stays as a **still-grab tool** (and classic grab backup).

---

## Two different jobs (do not mix)

| Job | What paints / samples | Engine today |
|-----|----------------------|--------------|
| **A. Live picture on screen** (Ops wall, Command Wall, FR tiles, ANPR tiles, matrix, …) | Browser `<video>` | **HTTP-FLV via mpegts.js** (`AxiomFlvManager` / `attachFlvPrimary`) when WVP handoff on |
| **A backup (handoff off / classic)** | Browser canvas | **JSMpeg** on Fleet mpeg1 WebSocket — **not** ffmpeg playing the wall |
| **B. Server still for AI** (FR probe, ANPR live poller every ~250 ms) | One JPEG file/buffer | **`ffmpeg`** pulls 1 frame from ZLM **FLV URL** (`grabJpegFromFlv`) — or from classic mpeg1 WS if no handoff |

When the ANPR disc said “ffmpeg FLV,” it meant **job B**: snap from FLV URL. It did **not** mean the live tile switched back to ffmpeg.

```text
BWC → WVP/ZLM ── HTTP-FLV ──┬── browser mpegts  → you see Live   (job A)
                            └── server ffmpeg -frames:v 1 → JPEG → YOLO/OCR (job B)
```

Same FLV stream, **two consumers**. That second consumer is why ANPR can burn CPU while the tile jerks — still FLV world, extra ffmpeg demux.

---

## What “all changed to FLV” actually locked

- WVP/ZLM handoff stays the **video base**.  
- Surfaces attach **FLV primary** (not JSMpeg-first).  
- Pin = **mirror wall** (no second pin player storm).  
- Soft chase on mpegts; hard `liveBufferLatencyChasing` stays **off**.

**Not locked:** “delete ffmpeg from the repo / never spawn ffmpeg.”

Ship still vendors `vendor/ffmpeg-lgpl/ffmpeg.exe` for stills and other decode helpers.

---

## What “ffmpeg as backup” means in practice

| Meaning people say | Actual |
|--------------------|--------|
| Backup **live player** if FLV fails | Classic path = **JSMpeg / mpeg1 WS**, not “ffmpeg window” |
| Backup **still grab** if ZLM FLV URL missing | `grabJpeg()` classic: ffmpeg reads **mpegts** from Fleet WS |
| Backup if handoff off | Live UI may fall to JSMpeg; grabs use classic ffmpeg WS path |

So: **ffmpeg = backup/primary still-grabber**, not backup FLV **viewer**.

---

## Why this matters (ANPR / jerk disc)

- Fixing live jerk ≠ removing FLV.  
- Optional later MOB (already named in crop/jerk disc): prefer **ZLM HTTP snapshot API** if available → fewer ffmpeg FLV pulls. That would still be **FLV/ZLM world**, just less ffmpeg.  
- Do **not** turn handoff off to “avoid ffmpeg.”

---

## One line for the desk

**We watch FLV. We still use ffmpeg to photograph FLV for plates/faces.**

---

## Operator next

No APPLY required for this clarification.  
If you want less ffmpeg on live ANPR: that is part of **`ANPR-LIVE-CPU-BUDGET-SHARP-EMIT-V1`** (optional ZLM snap), not a player rollback.
