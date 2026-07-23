# MOB DISC — Resolution really changes · soft chase exists but **not on wall soft overlay**

**Status:** LOCKED 2026-07-16 ~23:52  
**Search:** `resolution change`, `soft live catch`, `20sec`, `dont be a fool`, `check log`  
**Log session:** boot 23:46 · `zlm-relay primary` × 2 · chase not in wall overlay code

---

## Agent was wrong (own it)

| Bad claim | Correction |
|-----------|------------|
| “Res change = just different player look” | **Foolish.** Log shows real decode/dimension faults. |
| “~20s lag is expected / leave it” | Soft live catch **already exists** in lab tile code — wall soft overlay **does not use it**. Check before shrug. |

---

## Log check (resolution — real)

After openh264 relay came up (~23:47):

```
zlm relay ffmpeg … [mpeg2video …] Invalid frame dimensions 0x0
… Error submitting pac…
live broker zlm-relay primary | cam … after wvp_miss
```

Also: `pool rtp received` … `"format":"mpeg"`.

So the relay is decoding **mpeg** from the Fleet pool WS and hitting **0×0 frame dimension** errors before/while publishing. That is a **real resolution / geometry break**, not “object-fit looks different.” Operator report matches the log.

---

## Soft live catch — where it is / isn’t

| Place | Soft chase? |
|-------|-------------|
| `public/js/wvp-lab-tile.js` | **Yes** — `chaseLiveEdge` (soft rate + hard seek >10s). Lab two-tiles UI (now hidden). |
| `public/js/live-player-factory.js` → `softAttachZlmOverlay` (Fleet **wall** soft ZLM) | **No** — `liveBufferLatencyChasing: false`, **no** `chaseLiveEdge` |

So: we **did** solve chase for the **lab tile** path.  
Wall soft overlay after `zlm-relay primary` **never got that chase**. Lag complaint is fair — agent should have checked that first.

---

## What you are running (still)

| Line | Meaning |
|------|---------|
| `zlm-relay primary` | Plan B soft overlay on |
| `wvp-zlm primary` = 0 | Not WVP Plan A |
| Res jump + lag | Relay decode/encode + wall overlay **without** soft chase |

---

## Next MOBs (paper — need your APPLY)

| MOB | Fix |
|-----|-----|
| **`mob-wall-soft-zlm-live-chase-v1`** | Port lab `chaseLiveEdge` into `softAttachZlmOverlay` (wall) |
| **`mob-zlm-relay-stable-geometry-v1`** | Fix relay input/scale so no `0x0` / resolution flip (probe size / wait for valid frame / scale flags) |

Order suggestion: chase first (lag), then geometry (res) — or both if you list two APPLYs.

---

## One line

**Res change = real (log 0x0). Soft chase exists on lab tile, not on wall soft overlay — wire chase there; don’t dismiss lag.**
