# MOB DISC — ANPR Offline Match slow / no capture / server bounce (2026-08-05)

**Status:** APPLIED `ANPR-OFFLINE-FASTPATH-DOWNSCALE-V1` (2026-08-05).  
**Scope:** ANPR Offline Match only. Live watch / FR unchanged.

## Confirm: I understand

Offline Match on an **~8 min video** feels frozen — **nothing captured**. Server / ANPR engine **keeps going up and down**.

Question: is offline the **same path as live**?

## Honest answer: **No. Not the same.**

| | **Live Watch** | **Offline Match (now)** |
|--|----------------|-------------------------|
| Who grabs frames | Server ffmpeg, 3–5 FPS, drop-oldest | **Browser** canvas while video is **playing** |
| How often | Newest frame only; stale dropped | Timer every **1.8s**, but waits if last `/read` still busy |
| OCR path | Live track → FastALPR fast-path (BWC) | Full **`/api/analytics/anpr/read`** with sidecar **`ocr_path: heavy`** (timeout up to **180s**) |
| Frame size | Scaled still | **Full video resolution** JPEG 85% |
| UI feedback | Rail + health | Status stays **quiet** unless a plate hits |

So an 8-minute file is not “scanned like live.” It is: play video → every few seconds ship a huge still → dual-engine heavy OCR → wait → maybe one plate.

That also explains **server up/down**: heavy OCR + big JPEGs spike CPU/RAM. Sidecar or Node looks dead; health / restart loop.

Other silent drops (even when OCR works):

- No plate **and** no vehicle crop → rail gets nothing.
- Same plate ignored for **8 seconds**.
- Sampling **stops on pause**. If play never starts, zero frames.

## Recommendation (one next MOB)

Make offline **closer to live BWC fast-path**, without rewriting Live:

1. Downscale stills (max ~1280 wide) before upload.
2. Offline `/read` use **fast** OCR path (FastALPR), not heavy dual-engine.
3. Keep one-in-flight; **drop** the next timer tick if still busy (already almost this — keep it).
4. Status line: `Sampling…` / last skip reason, not silence.
5. Do **not** change live poller, FR, or plate lists.

This should stop the bounce and actually put plates on Recent for an 8-min clip.

## One next APPLY

**`MOB-APPLY ANPR-OFFLINE-FASTPATH-DOWNSCALE-V1`**

## Operator pass (after APPLY)

Hard-refresh. Offline Match → load the 8-min video → **press Play**.

- Status shows sampling (not blank for minutes).
- Some plates appear on Recent / offline rail well before the video ends.
- Server / ANPR Engine stays **OK** (no up/down loop).
- Live ANPR watch still works after.
