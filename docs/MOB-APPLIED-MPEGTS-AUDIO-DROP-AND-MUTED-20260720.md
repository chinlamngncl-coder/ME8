# MOB-APPLIED — MPEGTS audio drop + muted (wvp handoff)

**Date:** 2026-07-20  
**MOB:** `MOB-APPLY-MPEGTS-AUDIO-DROP-AND-MUTED`  
**Scope:** Frontend micro-lift — `public/js/live-player-factory.js` only (handoff path).

---

## Problem

Attach storm fixed; FLV proxy/token PASS. Wall still black. Diagnosis: BWC multiplexes **PCMA (G.711)** audio in FLV; mpegts.js MSE cannot decode PCMA → pipeline aborts before H.264 renders.

---

## Change

`attachFlvPrimary()` (wvpVideoHandoff wall player):

1. **`hasAudio: false`** (+ `hasVideo: true`) in `mpegts.createPlayer()` media config — ignore PCMA track entirely.
2. **Strict HTML mute + autoplay** on `<video>` before `attachMediaElement()`:
   - `video.setAttribute('muted', 'muted')`
   - `video.setAttribute('autoplay', 'autoplay')`
   - `video.muted = true`, `video.autoplay = true` (unchanged)

Pattern matches `wvp-lab-tile.js` (lab tile already used `hasAudio: false` for G.711).

---

## Cache bust

`index.html`: `live-player-factory.js?v=20260720-mpegts-audio-drop-v1`

---

## Operator test

1. Hard refresh dashboard (Ctrl+Shift+R).
2. Open All / single cam live (wvp handoff).
3. Expect: `[me8-flv] attach ok` in console + **picture on wall** within ~10s.
4. Audio from FLV intentionally absent (PTT/native path separate).

---

## Files

| File | Change |
|------|--------|
| `public/js/live-player-factory.js` | `hasAudio: false`, muted/autoplay attributes |
| `public/index.html` | cache bust |
