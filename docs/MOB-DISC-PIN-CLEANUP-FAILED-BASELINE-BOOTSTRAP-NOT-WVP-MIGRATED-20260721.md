# MOB DISC — Pin cleanup still FAIL: baseline bootstrap was restored, not migrated

**Date:** 2026-07-21 ~10:17  
**Status:** FAIL locked — DISC only, no code change  
**Operator:** Pin still requires Panel Play or Open All first; only then can pin show/play with a stable layout.

---

## Direct answer

Yes, we said “bring classic/Gold pin path back and put WVP/ZLM paint into it.”

What was actually restored was incomplete:

1. The classic pin click/open/dock functions were restored.
2. The WVP `<video>` mirror was added for the case where a wall source **already exists**.
3. The classic **pin-first bootstrap** still falls back to a pin JSMpeg canvas while WVP is starting.

That fallback cannot receive WVP FLV pixels. Therefore:

- **Panel/Open All first:** creates a stable WVP wall `<video>` → pin mirror works.
- **Pin first:** starts asynchronously, but initially enters the classic JSMpeg/pool path → black/unstable until a wall owner exists.

The cleanup restored baseline code, but did not finish the media-source migration at the bootstrap boundary.

---

## Why Panel or Open All makes it work

### Panel Play

Panel Play establishes:

- a concrete wall slot for `camId`
- a persistent wall player owner
- WVP `startPlay`
- `<video.me8-zlm-primary>`
- FLV `onProven`

When the pin opens afterward, `wallMirrorSourceForCam(camId)` finds that video immediately and mirrors it.

### Open All

Open All additionally establishes:

- `openAllSlotByCam`
- reserved wall slots
- pending ownership for every camera
- staggered WVP starts
- the baseline popup/dock plan

So both media ownership and layout are already settled before the pin needs them.

### Pin first

The restored baseline path does:

```text
pin click
→ playMapPinVideoIfPopupOpen
→ playOnMapPopup
→ requestStreamForCam + wall claim
→ create map-pin-video-canvas
→ attachCanvasPlayer (JSMpeg)
```

Classic Fleet supplied MPEG-TS/JSMpeg data to that pin canvas. WVP handoff does not.

The WVP mirror graft only helps later:

```text
wall FLV proves
→ wallMirrorSourceForCam finds <video>
→ startMapMirrorFromWall
```

If popup ownership/layout closes, remounts, or releases before that asynchronous transition, the pin remains black or the stream is stopped.

---

## Log evidence

The latest test proves pin-first is reaching the backend:

- `10:14:56–10:14:59`: `start-video` and `wvp video handoff start` for kk and Chin
- `10:15:14–10:15:15`: another pin-driven WVP handoff start for Chin

So the problem is **not** “pin click never calls WVP.”

The same session then shows:

- Ops `stop-video`
- viewer refs falling to zero
- WVP hard-stop shortly afterward

This matches unstable ownership during the pin-first bootstrap. Panel/Open All prevents that by owning the wall stream first.

---

## Why “baseline restored” was not enough

The baseline product contract is correct:

> Click pin first → live starts → pin picture appears → wall and pin remain coherent.

But the baseline implementation assumed:

```text
Fleet INVITE → liveStreamPool → JSMpeg canvas
```

WVP uses:

```text
WVP startPlay → ZLM FLV → wall <video>
```

Byte-restoring the baseline client functions preserves the UI contract but also restores a dead media fallback. Migration requires an anti-corruption adapter at the existing media bootstrap—not a new pin UX.

---

## What remains correct

- Fleet/Gold click behavior is the product law.
- Fleet/Gold Call/PTT controls remain the product law.
- WVP/ZLM remains the video base.
- Pin remains a pure mirror; no second FLV player.
- No hardcoded Chin/kk.
- No new layout algorithm.

---

## Correct migration boundary (not a new invention)

Keep the baseline functions and change only the existing media adapter:

1. Existing pin `requestStreamForCam(camId)` still represents “operator requests live.”
2. Under WVP, that request must maintain a stable wall/viewer owner while `startPlay` is pending.
3. During pending state, show the existing “Live streaming…” overlay; do not attach the dead pin JSMpeg canvas.
4. On existing FLV `onProven`, use the existing mirror-from-wall-video path.
5. Popup/dock lifecycle must not release the WVP viewer during that pending handoff.
6. Panel/Open All and pin-first must converge on the same existing wall ownership path.

This is migration of Fleet’s media adapter. It is not a new click handler, new player, or new layout.

---

## Status correction

`PIN-FLEET-BASELINE-PLAYER-ONLY-CLEANUP-V1` is **FAIL**, not complete:

| Part | Result |
|---|---|
| Classic pin UI functions restored | Yes |
| WVP wall-video mirror when source already exists | Yes |
| Pin-first WVP bootstrap parity | **No** |
| Stable direct-pin layout/ownership | **No** |

---

## Do not do next

- Do not stack another FOCUSED/FORCE/NO-TOPLEFT patch.
- Do not redesign Leaflet click behavior.
- Do not add a second FLV player to the pin.
- Do not tell the operator to use Panel/Open All first.
- Do not mark pin PASS because panel-first works.

---

## Bottom line

**You were right: panel-first is a workaround, not restored Fleet behavior.**

We restored baseline UI and grafted WVP paint, but left the classic JSMpeg pin-first bootstrap underneath. The remaining job is to migrate that existing bootstrap/ownership adapter to WVP while leaving Fleet click, layout, Call and PTT design intact.
