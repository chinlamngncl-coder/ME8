# MOB-APPLIED — REDACT-SPAN-LABEL-COPY-V1 (Package F)

**Date:** 2026-07-23  
**Status:** APPLIED — operator verify  
**Disc:** `docs/MOB-DISC-REDACT-SPAN-LABEL-COPY-OPTIONS-20260723.md`  
**Choice:** Package **F** (no “playhead” / “±1s”)

## Copy (i18n)

| Key | Text |
|-----|------|
| `redactSpanLabel` | Blur this box |
| `redactSpanWhole` | On the whole video |
| `redactSpanFrom` | From this moment to the end |
| `redactSpanWindow` | Only around this moment (~2 s) |
| `redactSpanHint` | Scrub to the face first, then draw. Dropdown = how long the blur stays — not cutting the file. |

Behaviour unchanged (whole / from / ±1s window math). Hint shown under the dropdown + as select `title`.

## Files

- `public/locales/en.json`
- `public/js/evidence-hub.js` — hint element + title
- `public/index.html` — CSS + cache `?v=20260723-redact-span-label-copy-f-v1`

## Operator check

1. Hard refresh Evidence → open Redact on a clip.  
2. Dropdown label reads **Blur this box**; options match Package F.  
3. Hint under control explains scrub → draw; not a file cut.  
4. Pick “Only around this moment (~2 s)”, draw a box — blur still ~2s around that moment (same as old ±1s).

**PASS** = words clear; blur timing same as before.
