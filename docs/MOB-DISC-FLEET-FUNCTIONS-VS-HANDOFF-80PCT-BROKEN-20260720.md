# MOB DISC — Clarify pin auto-open + “80% functions destroyed” under handoff

**Date:** 2026-07-20  
**Status:** DISC only — no code  
**Operator pushback:** Fleet = click pin → pin video + panel video. “Stop auto-opening every wall cam’s pin” sounds wrong. Stopped by BWC, signal lost, etc. should still be there — feels like ~80% of performance functions destroyed, not 1–2 items.

---

## 1. You are right about normal Fleet click

**Classic operator flow (still the design):**

| Action | Expected |
|--------|----------|
| Click **map pin** / fleet row | That cam’s **pin popup** opens + **wall panel** starts for **that cam** |
| Click **wall panel Play** | Panel live for that slot + pin for that cam (Firmware Gold / Jul-18) |

That is **`selectFleetDevice` → `assignCamToSlot` + `openPinPopupForCam`** — unchanged intent.

**I was not saying Fleet “doesn’t open pin when you click pin.”**  
I was pointing at an **extra code path added during WVP handoff** that Fleet Jul-18 **does not have**.

---

## 2. What “auto-open every wall cam’s pin” actually means

**New in current tree (not in Jul-18 classic baseline):**

```text
ensurePopupsForLiveWallCams()
  → for every wall slot that isn’t Stopped/Idle
  → syncMapPinForCam(id, { openPopup: true })
  → playMapPinVideoIfPopupOpen for each
```

**Called from:**

| Trigger | When |
|---------|------|
| `attachWvpHandoffFlvToWallSlot` `onProven` | **2+** wall cams live after FLV proves |
| `focusMapPinQuiet(camId)` | Wall slot click, panel Play, roster assign — **after** opening the focused cam |

`focusMapPinQuiet` comment in code: *“Keep every live wall panel's map popup open.”*

So:

- **Your click on one pin** → still one pin + panel (normal).
- **Additionally**, when a **second** panel goes live (Open All, multi-play, FLV prove), code may **open pin popups for all live wall slots** without you clicking each pin.
- **Additionally**, clicking a **wall panel** can open pins for **all** live panels, not only the one you touched.

That extra behavior can fight **8-pin dock layout** (mass `assignColocatedPinPopupDocks`) — it is **not** replacing pin-click, it is **on top of** it.

**If you never Open All / never have 2+ wall live**, you may never hit this path — then my earlier note sounded like nonsense. Fair.

---

## 3. “80% destroyed” — code still there, FLV path doesn’t run it

The functions **were not deleted** from the repo. Grep shows full implementations still present:

- `markBwcStoppedOverlay` / Stopped by BWC  
- `markVideoSignalLost` / Video signal lost  
- `ensureBwcStallWatch` / stall → stopped  
- `video-stream-stopped` `device_bye`  
- Operator stop, lazy pin, dock layout, PTT chrome, etc.

**Problem:** most wall/pin **health overlays and stall logic are wired to JSMpeg `canvas`**, not handoff `<video class="me8-zlm-primary">`.

### Canvas gates (same lines in Jul-18 classic — worked there because wall **was** canvas)

| Function | Wall gate | Under FLV handoff |
|----------|-----------|-------------------|
| `markBwcStoppedOverlay` | `stage.querySelector('canvas')` | **No-op on wall** (video only) |
| `markVideoSignalLost` | `stage.querySelector('canvas')` | **No-op on wall** |
| `camHasActiveLiveVideoSurface` | wall live + **canvas** | Returns false → stall watch **exits early** |
| `device_bye` → stopped chrome | calls `markBwcStoppedOverlay` | **Wall stays “Live” visually** if only video |
| Pin stopped/signal | pin `canvas` or mirror canvas | **May work** if pin mirror canvas exists |

Jul-18 classic: Fleet INVITE → JSMpeg **canvas** on wall → these paths **fired**.  
Handoff: WVP FLV → **`<video>`** on wall → same functions **silently skip**.

So operator experience: *“Stopped by BWC / signal lost / stall — all dead”* — **feels like 80% gone** even though source files still contain the labels and CSS.

That matches **systemic regression**, not two missing MOBs.

---

## 4. What still works vs what’s broken (handoff lab)

| Area | Jul-18 Fleet + canvas | Handoff FLV now |
|------|----------------------|-----------------|
| Click pin → open popup | ✓ | ✓ (popup opens) |
| Click pin → panel live | ✓ Fleet INVITE | ✓ WVP startPlay |
| Pin video picture | ✓ mirror / JSMpeg | ⚠ mirror from `<video>` — racey |
| Wall picture | ✓ JSMpeg | ✓ FLV (after audio-drop etc.) |
| **Stopped by BWC (wall)** | ✓ | ❌ canvas gate |
| **Video signal lost (wall)** | ✓ | ❌ canvas gate |
| **Stall watch → stopped** | ✓ | ❌ canvas gate |
| **device_bye chrome** | ✓ | ❌ wall path |
| Operator Stop | ✓ | ⚠ partial / teardown |
| PTT / SOS ACL / GPS | ✓ | ✓ (separate pipes) |
| 8-pin dock / lazy pin | ✓ | ✓ but more re-dock churn |
| **Extra: open all live wall pins** | **not in Jul-18** | ✓ added (handoff) |

---

## 5. Why it feels “totally different from Fleet”

Not one switch — **three stacked issues:**

1. **Video pipe swap** — INVITE/JSMpeg → WVP/FLV (intended).  
2. **Health/stop/stall UI never updated** for `<video>` — large share of “performance functions” **inert** on wall.  
3. **Handoff-only pin storm** — `ensurePopupsForLiveWallCams` + aggressive dock resets (layout jump), **not** classic pin-click semantics.

Fleet **semantics** (click pin → that unit’s pin + panel) are still the product. **Execution** under handoff does not honor most wall lifecycle chrome.

---

## 6. Corrective direction (DISC — APPLY separate, no bundle)

| Priority | MOB | Intent |
|----------|-----|--------|
| **A** | `MOB-APPLY-FLV-WALL-LIFECYCLE-PARITY-V1` | Stopped by BWC, signal lost, stall watch, device_bye — treat **`video.me8-zlm-primary`** same as canvas on wall + pin |
| **B** | `MOB-APPLY-HANDOFF-PIN-ONLY-FOCUSED-CAM-V1` | Remove or gate `ensurePopupsForLiveWallCams` — **only** open pin for **operator-selected** cam (pin click / fleet row / panel play for **that** slot) |
| **C** | `MOB-APPLY-WVP-HANDOFF-PIN-MIRROR-HARDEN-V1` | Pin picture after wall Live |
| **D** | Pin dock stable | Less full reset on wall decode |

**Do not** read A as “two items” — it is **one genre** (wall lifecycle parity).

---

## 7. One line

You’re right: **Fleet click pin → pin + panel** is the model. The “auto-open all wall pins” line referred to **extra handoff code**, not your normal click. **Stopped by BWC / signal lost / stall** are still in the tree but **don’t run on FLV wall** because logic checks **`canvas` only** — that’s why ~80% of live performance behavior feels destroyed, not because the features were removed.
