# MOB DISC — FAIL pin jump · layout rules stay · only change the player

**Date:** 2026-07-20  
**Status:** LOCKED (paper) — **no code until named APPLY**  
**Operator:** FAIL on `PIN-FLV-MIRROR-HARDEN-V1` — pin **jumps all around**; “we have done this since day 1 — use the codes, just change the players”; **follow layout rules**.  
**Screenshot:** kk wall Panel 2 Live + map pin shows picture — **picture may be OK**; **layout FAIL**.

---

## Plain English

| What you asked | Locked answer |
|----------------|---------------|
| Pin jumps | **FAIL** — layout, not “no picture” |
| Use day‑1 codes? | **Yes** — keep Firmware Gold / classic **dock, Fit pins, slim 8, colocated fan** |
| Just change players? | **Yes** — only swap **what** the pin paints from (wall canvas → wall FLV `<video>`). **Do not** rewrite layout |
| Layout rules | **Must follow** — pin MOB must not re-dock / auto-open storm / clear drag offsets as a side effect of FLV |

---

## Layout rules (already locked — follow these)

| Rule | Source |
|------|--------|
| Pin video = **mirror wall** (one stream), no second pin pipe | Firmware Gold / `MOB-DISC-FIRMWARE-GOLD-PIN-MIRROR.md` |
| Slim 8 chrome (size) ≠ dock math rewrite | `MOB-DISC-PIN-POPUP-SLIM-8-LAYOUT-20260719.md` |
| WVP = **video pipe only**; pin chrome/dock stay Fleet classic | `MOB-DISC-WVP-VIDEO-ONLY-BUT-PIN-LAYOUT-NOT-FLEET-20260720.md` |
| Pin jump / auto-open = **separate** MOB from picture | Harm plan **D1 / phase 7** `PIN-FOCUSED-OPEN-V1` |
| Close ≠ Stop; don’t invent layout in video MOBs | Operator + Close-safe disc |

**Forbidden in a “player” MOB:**  
`ensurePopupsForLiveWallCams` storms, repeated `assignColocatedPinPopupDocks`, clearing `pinPopupDragOffset`, auto-opening every live wall cam, chase loops that re-sync layout.

---

## Why harden felt like a layout break

`PIN-FLV-MIRROR-HARDEN-V1` touched **mirror / chase / sync** in `video-wall.js`. Under handoff, wall `onProven` already does:

- `syncMapPopupPlayer`
- when **≥2** live → `ensurePopupsForLiveWallCams` + `assignColocatedPinPopupDocks`

Harden added **`schedulePinFlvMirrorChase`** (extra sync retries). Extra syncs + existing multi-live auto-pin/dock = pins **snap / jump** — same class of harm as day‑1 layout fights, not a new product.

**Operator rule you stated:** picture path = change **player/mirror source only**. Layout path = **reuse existing dock code**, fix jump in **its own MOB**.

---

## Split (do not bundle)

| MOB | Job | Not job |
|-----|-----|---------|
| **Pin picture** (player only) | Mirror wall FLV `<video>` → pin canvas; keep Gold attach/stop | No dock, no Fit pins rewrite, no auto-open |
| **`PIN-FOCUSED-OPEN-V1`** (layout) | Stop jump / auto-pin storm; keep day‑1 dock / Fit pins / 8 layout | No new FLV engine |

**Recommendation (one path):**  
Treat harden as **picture OK / layout FAIL**.  
Next APPLY = **`PIN-FOCUSED-OPEN-V1`** — kill auto-open + dock reset storm; **do not** invent new layout; call existing dock helpers only when operator opens a pin (day‑1 behavior).

If picture also fails after layout fix → tiny player-only follow-up (no layout calls).

---

## Agent must NOT

- “Fix jump” by redesigning Fit pins / 8 fan from scratch  
- Bundle layout into another FLV picture MOB  
- Ask operator to pick A/B menus — **next is phase 7**

---

## One line

**FAIL = pin jumps. Keep day‑1 layout code; only change the video player/mirror. Next: `MOB-APPLY PIN-FOCUSED-OPEN-V1`.**
