# MOB-DISC — Half PASS: wall yes, pin no · Jul 19 work gone?

**Date:** 2026-07-20 ~16:06  
**Status:** DISC only — **no code, no restore**  
**After:** `MOB-APPLY-MPEGTS-AUDIO-DROP-AND-MUTED`  
**Operator:** Half pass — wall panels 1 + 5 show picture; Chin map pin stuck **“Live streaming…”** black. Panel 5 open again — feels like old WVP déjà vu. Fears Jul 18+ non-WVP work (pin size, panel size, rotation) was lost.

---

## Verdict (one screen)

| What | Status |
|------|--------|
| WVP handoff + FLV + `hasAudio:false` | **PASS** — wall picture paints |
| Map pin popup video | **FAIL** — streaming overlay, no picture |
| Panel 5 duplicate (Chin in 1 + 5) | **Expected** with auto-rotate + poll slots — not a regression signature |
| Jul 19 panel sizing / 16:9 fit | **LIKELY LOST** — restore floor predates those MOBs |
| Jul 17 pin-mirror-from-video | **NOT PRESENT** — never re-applied after Jul 20 restore |
| Full “classic + Jul 19 polish” tree | **No** — you are on **Jul 18 restore + Jul 20 WVP stack only** |

**Half pass is architectural, not random.** Same wall-pass / pin-fail split as Soft Open Jul 17 (`MOB-DISC-SOFTOPEN-WALL-PASS-PIN-FAIL-20260717.md`). Audio-drop fixed wall; pin path was never wired for handoff `<video>`.

---

## What your screenshot shows

| Surface | Chin | kk |
|---------|------|-----|
| Panel 1 | **Live + picture** | — |
| Panel 5 (poll rotate) | **Live + picture** (same cam) | — |
| Map pin popup | **“Live streaming…”** — no picture | not open |

Wall = mpegts FLV on `video.me8-zlm-primary`.  
Pin = Firmware Gold **canvas mirror** (`startMapMirrorFromWall` → `wallCanvasForCam`).

Handoff path **removes JSMpeg canvas** and uses `<video>` instead. Pin mirror finds **no canvas** → overlay never clears → black.

Code facts:

- `attachWvpHandoffFlvToWallSlot` on prove calls `syncMapPopupPlayer(camId)` — pin **is** nudged.
- `wallCanvasForCam()` only returns `.video-slot-stage canvas` with `width > 8`.
- `attachMapPopupPlayer` → `startMapMirrorFromWall` only `drawImage(srcCanvas, …)`.
- No `wallMirrorSourceForCam` / video-element mirror in current tree (that was `mob-softopen-pin-mirror-from-video-v1`, Jul 17).

Paper already warned at Phase 4:

> `MOB-APPLIED-BACKEND-VIDEO-UI-FLV-ON-READY-V1` — pin may stay placeholder until **separate MOB**.

---

## Panel 5 again — why it feels like “last time WVP”

**By design**, not a time-machine bug:

- Slots **1–4** = fixed assignments (Chin in panel 1).
- Slots **5–6** = **poll extras (rotate)** when `#video-wall-poll` (Auto-rotate) is checked.
- With **one** extra online cam, poll slot shows **the same cam** as a fixed slot → Chin in **1 and 5**.

Same symptom as prior WVP/Soft Open sessions when only Chin is live. Annoying, not proof the whole repo rewound.

---

## Did we fall back and lose Jul 18+ work?

### Yes — partially, and on purpose for this arc

| Event | What it did |
|-------|-------------|
| **Jul 18** | `RESTORE-ME8-CLASSIC-PASS-20260718` — classic PASS floor snapshotted |
| **Jul 19** | Many **panel** MOBs (348px rail, 16:9 fit-five, full-frame, etc.) — applied on **pre-restore** tree |
| **Jul 20 AM** | **`RESTORE-ME8-CLASSIC-PASS-ONLY`** again — **2510 files** from Jul 18 baseline (`MOB-APPLIED-RESTORE-CLASSIC-PASS-ONLY-20260720.md`) |
| **Jul 20 PM** | WVP split MOBs stacked **on top** of that Jul 18 floor (ACL, handoff, proxy, token, dedupe, audio-drop) |

So:

- **Not** a mystery git revert today.
- **Yes** — Jul 20 restore **replaced working tree with Jul 18 snapshot**, which **does not include Jul 19 panel MOBs** unless re-applied after restore.

### Evidence in tree now

| MOB (Jul 19) | Expected | Current tree |
|--------------|----------|--------------|
| `PANEL-16x9-FIT-FIVE-NO-CLIP` | `#video-wall` **348px**, JS 16:9 stage sizing | `#video-wall` **272px**; no fit-five JS in `video-wall.js` |
| `PANEL-MATCH-PIN-FULL-FRAME` | stage `aspect-ratio: 16/9` | `.video-slot-stage` — flex only, **no** 16:9 |
| `SOFTOPEN-PIN-MIRROR-FROM-VIDEO` | mirror wall `<video>` to pin | **Absent** — grep finds no `wallMirrorSourceForCam` |

Pin box `height: 136px` may still match an older pin MOB — **panel rail / fit-five work is what visibly regressed**.

**Jul 18+ non-WVP work is not “inside this now”** for panel sizing. WVP backend work **is** new on this floor.

---

## Pipe status (honest)

```
Cold SOS (ACL)           ✅ (prior; not re-tested this round)
handoff startPlay        ✅
token + FLV proxy        ✅
mpegts wall (audio drop) ✅  ← first picture in days
map pin mirror           ❌  ← known gap
PTT / Call 29201         ❌  parked
Jul 19 panel polish      ❌  lost to Jul 20 restore floor
```

---

## Why this feels like wasted days

1. **Jul 20 restore** reset UI to Jul 18 to get a clean WVP floor — **traded away Jul 19 panel work** (documented, not secret).
2. **WVP video path** was built as **wall-only micro-lifts**; pin was **deferred** every time (Phase 4 paper).
3. **Audio-drop** finally unlocked wall — exposes the **old** pin gap immediately → feels like “back at square one” even though wall is **new progress**.

Not zero progress: backend split + first wall picture. Pin + panel polish are **separate gaps**.

---

## Forward (when you APPLY — do not bundle)

| Priority | Name | Intent |
|----------|------|--------|
| **1** | `MOB-APPLY-WVP-HANDOFF-PIN-MIRROR-FROM-VIDEO-V1` | Extend pin mirror: canvas **or** `video.me8-zlm-primary` (reuse Jul 17 Soft Open pattern; handoff-specific) |
| **2** | `MOB-APPLY-REAPPLY-PANEL-16x9-FIT-FIVE-V1` | Re-apply Jul 19 panel rail + stage sizing **on current tree** (named re-apply, not restore) |
| **3** | `MOB-APPLY-START-VIDEO-HANDOFF-DEDUPE-V1` | Backend debounce (still useful; separate) |
| **Later** | PTT 29201 | Parked until live path PASS includes pin |

**Do not** `RUN RESTORE-…` to “get panel back” — that **removes** today’s WVP handoff work too.

---

## One line

Half pass = **wall handoff works** (audio-drop fixed MSE); pin fails because **mirror still wants JSMpeg canvas** and Jul 20 **classic restore dropped Jul 19 panel + Jul 17 video-mirror fixes** — not a full rewind to pre-WVP, but **two known missing MOBs**, not another blind proxy chase.
