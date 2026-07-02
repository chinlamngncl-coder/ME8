# 08 — FFmpeg decouple blueprint (Google + Mobility decision)

**MOB DISC — not implemented until MOB-APPLY.**  
**Lane:** Enterprise / post urgent-ship (not lane A v1.9 unless env-only).

---

## Google blueprint (accepted)

### Resolution order (replace `ffmpeg-static` first)

| Priority | Where | Env / path |
|----------|--------|------------|
| 1 | **Explicit override** (enterprise) | `FM_FFMPEG_PATH` or existing `FFMPEG_BIN` |
| 2 | **Vendor folder** (Media Pack install) | `{appRoot}/vendor/ffmpeg/ffmpeg.exe` or `ffmpeg` |
| 3 | **System PATH** | `ffmpeg` on host (apt/winget/choco) |

Today `lib/resolveFfmpeg.js` is: bundled npm → `bin/ffmpeg.exe` → env → PATH. **Enterprise flip:** env → vendor → PATH → **no npm bundle**.

### Pre-flight codec check (required)

On startup, run `ffmpeg -codecs` (or `-encoders`) and verify minimum set for live/SOS:

| Codec / capability | Why |
|--------------------|-----|
| H.264 decode (`h264`) | BWC live ingress |
| AAC or PCM path | Audio branches |
| MPEG-PS / copy path | BWC stream format |

If missing → **see failure mode below**.

Log: path used, version line, codec check result → Settings / `/api/platform/status`.

### Media Pack (ship outside app)

| Item | Location |
|------|----------|
| Install scripts | `scripts/INSTALL-FFMPEG-WINDOWS.ps1`, `INSTALL-FFMPEG-LINUX.sh` |
| Optional binary drop | `vendor/ffmpeg/` (customer or script — **not** in npm) |
| UI | Settings → **Media runtime: OK / Missing** + link to install script |

**Not in browser.** Server only.

---

## Design decision — Google question

> Hard crash on boot if FFmpeg missing, or degraded boot (GPS/text OK, video grayed out)?

### Mobility decision

| Profile | Behaviour |
|---------|-----------|
| **Production / enterprise (default)** | **Hard fail at startup** — server does not run if FFmpeg missing or fails codec check |
| **Lab / support only** | **Degraded boot** when `FM_FFMPEG_OPTIONAL=1` — maps/GPS/PTT OK; video/SOS live disabled with clear banner |

**Why hard fail for SOS product:** A “green” server that fails SOS video in an emergency is worse than install-time failure. Customer fixes Media Pack **before** go-live.

**Why optional degraded exists:** Field engineer diagnosing network without video; not for production dispatch.

---

## MOBs (when approved)

| MOB ID | Work |
|--------|------|
| `mob-compliance-ffmpeg-enterprise` | Resolution order flip; remove bundled requirement |
| `mob-ffmpeg-codec-preflight` | Startup `-codecs` check |
| `mob-ffmpeg-media-pack-scripts` | Windows/Linux install scripts + Settings status |
| `mob-ffmpeg-optional-lab-flag` | `FM_FFMPEG_OPTIONAL=1` degraded path |

**After each MOB:** cold SOS + live wall smoke. **Lane A urgent ship:** keep v1.9 bundled ffmpeg until these MOBs land.

---

## Reply to paste to Google

> We choose **hard fail at startup** for production/enterprise when FFmpeg is missing or fails codec preflight. Optional **degraded boot** only with `FM_FFMPEG_OPTIONAL=1` for lab/support. Resolution: `FM_FFMPEG_PATH` → `vendor/ffmpeg/` → system PATH; Media Pack install scripts outside npm; preflight `ffmpeg -codecs` for h264/aac. Maps: attribution fix on lane A; offline PMTiles on lane B (8 BWC lab).

**Google (confirm if needed):**

```text
Agreed completely. A fail-fast approach on startup is the only acceptable pattern for a system handling SOS and life-safety feeds. A 'zombie' command centre that accepts dashboard connections but silently drops emergency video is a critical liability.

Your resolution cascade (ENV -> Vendor -> System) combined with the explicit `-codecs` pre-flight check aligns perfectly with enterprise deployment standards. Providing FM_FFMPEG_OPTIONAL=1 as an escape hatch for lab and CI/CD environments is a smart touch for developer experience.

We are fully aligned on this blueprint and on deferring the actual code changes until after your urgent Lane A shipment is out the door.
```

**Status:** Aligned 2026-06-27 — execute FFmpeg MOBs post Lane A only.

---

*2026-06-27*
