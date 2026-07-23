# MOB DISC — Forensic: pin still broken after gold slice · toast vs pin colour · locked-file drift

**MOB DISC ONLY — no code.**  
**Date:** 2026-07-10  
**Status:** Evidence pass after your anger report (fallback “still the same” + toast/pin colour culprit theory)  
**Search:** `live-voice-hint-toast`, `ptt-rx-live-toast`, `map-popup-ptt-rx`, `video-wall.js` DIFF gold, pin restore

---

## Calm facts (not conspiracy)

Nobody “painted toast gold to match pin” in the current CSS vs firmware gold.  
What *is* true: **locked files drifted after gold**, and **pin stack HUD for colocated Chin+kk is gold behavior** — so a layout-only restore feels like “nothing fixed.”

---

## 1. Why fallback still “looks the same”

`mob-map-pin-restore-firmware-gold-slice` only removed **our** failed experiments in `index.html`:

- `PIN_DOCK_PAIR_*` dock-gap  
- n=2 overlap rescue / 900 ms re-pass  
- spread min 88 → back to gold 58  

It restored gold’s rule: **for exactly 2 cams, `autoFanStackedPopups` returns early** (dock L/R only).

Firmware gold **also** shows **Overlapping / Stacked nearby** HUD for colocated Chin+kk.  
So Open All still stacking / HUD still there = **gold floor**, not proof the restore failed to apply.

**Surgical restore ≠ full `RUN RESTORE-ME8-FIRMWARE-GOLD`.**  
FR / Analytics / post-gold `video-wall` changes remain.

---

## 2. Toast vs pin colour — who did what?

### Two different toasts (do not mix)

| UI | ID | Colour (current = gold) | Role |
|----|-----|-------------------------|------|
| **“kk — voice on live”** Listen / Call / Dismiss | `#live-voice-hint-toast` | **Blue** (`#38bdf8` / slate) when active | Live voice hint |
| PTT live toast (bottom) | `#ptt-rx-live-toast` | **Amber/gold** (`#eab308`) when active | Field PTT RX |

Normalized CSS compare **current == firmware gold == poc-demo** for:

- `#live-voice-hint-toast`  
- `#live-voice-hint-toast.live-voice-hint-active`  
- `#ptt-rx-live-toast.ptt-rx-live-toast-active`  

Git blame on voice-hint active block: commit `b1027dc` (2026-07-02) — **blue by design**, before firmware gold lock.

### Pin video box gold outline

| Class | Colour | Meaning |
|-------|--------|---------|
| `.map-popup.map-popup-ptt-rx` | **Amber `#eab308`** | PTT receive chrome on pin |

Same amber family as **PTT toast**, **not** the blue voice-on-live toast.

**Design intent (gold):** voice hint = blue · PTT = gold — so operators don’t confuse “someone talking on live” with “PTT.”

### Verdict on “toast made same colour as pin”

| Claim | Finding |
|-------|---------|
| Someone recently recolored **voice-on-live** toast to match pin gold | **False** vs gold CSS — still blue |
| Pin gold outline = voice toast colour applied to box | **False** — pin gold is **PTT RX** class, same as gold baseline |
| Toast and pin “same colour” confusion | Easy mix-up: **PTT toast (gold)** vs **voice toast (blue)** vs **pin PTT outline (gold)** |

If Chin’s pin shows a **gold** border while only the **blue** “voice on live” toast is up for kk, that can still be:

- PTT linger / forced comm chrome on Chin, or  
- Screenshot timing with PTT chrome still on  

Code path (`video-wall.js` `applyMapPinPttCommUi`): when pin is open with live, `suppressChrome` should **hide** PTT gold outline. If you still see gold on a normal live pin with no PTT, that is a **separate bug** to soak — not a toast CSS recolor.

**`ptt-rx.js`:** MD5 **identical** to firmware gold. Locked PTT RX script was **not** rewritten in this thrash.

---

## 3. What *did* drift (locked / sensitive) — real risk

Compared to `baseline/2026-07-06-me8-firmware-gold`:

| File | vs gold | Notes |
|------|---------|--------|
| `public/js/ptt-rx.js` | **SAME** | OK |
| `public/js/fleet-ui.js` | **DIFF** | Only `MAX_PIN_SELECT` 6→8 (fleet scale) |
| `public/js/video-wall.js` | **DIFF** | Post-gold: `MAX_LIVE_STREAMS` 6→8, tab-stall pause, Open All pin-only stagger, wall-claim comments / path |
| `public/index.html` | **DIFF** (huge) | FR UI + our pin experiments (slice restored) + many genres |

**Locked-file rule:** `video-wall.js` / `fleet-ui.js` / `ptt-rx.js` must not change without explicit MOB naming them.  
Post-gold `video-wall.js` drift is the strongest “someone changed live path without a clean pin MOB” signal — not the toast colour.

That drift can affect Open All / pin live / wall claim even when pin **layout** CSS/JS matches gold again → feels like “fallback did nothing.”

---

## 4. What is *not* the main culprit

| Suspect | Status |
|---------|--------|
| Voice toast recolored to pin gold | **Not found** in CSS vs gold |
| Pin layout slice restore missing | Experiments removed; gold n=2 early-return present |
| FR crop rail / offline video | Unrelated to Ops pin stack |
| “Someone wants to hurt us” | No evidence of malice — **process break**: locked files + layout thrash without full restore |

---

## 5. Recommended next steps (you choose — no auto apply)

| Option | Phrase | Effect |
|--------|--------|--------|
| **A — Full firmware gold** | `RUN RESTORE-ME8-FIRMWARE-GOLD` | Nuclear: pins + `video-wall` + tree back to 2026-07-06; **loses** post-gold FR/UI |
| **B — Restore locked live JS only** | `MOB-APPLY mob-restore-video-wall-fleet-from-gold` | Copy `video-wall.js` (+ optional `fleet-ui.js` MAX_PIN) from firmware gold; keep FR in `index.html` — **you must name locked files** |
| **C — Accept gold pin UX** | — | Colocated = dock + Overlapping HUD; stop pin layout MOBs; use drag chips |
| **D — Toast colour MOB** | Only if you still want a **visual** change | e.g. force voice toast never amber — **CSS already blue**; only needed if a different element is wrong |

**Do not** invent another pin fan/gap MOB until A or B or C is chosen.

---

## 6. Separate parked genres (do not mix)

- FR best-frame / blur: `MOB-DISC-FR-BEST-FRAME-KEYFRAME.md`  
- FR alarm SOP / dossier links: `MOB-DISC-FR-ALARM-SOP-NEXT.md`  
- Crop rail 8: already applied (`MOB-DISC-FR-CROP-RAIL-8.md`)

---

## Bottom line

1. **Fallback “same”** ≈ gold colocated pin UX + remaining **`video-wall.js` post-gold drift**.  
2. **Voice toast was not recolored to pin gold** — CSS matches gold (blue). Pin gold = **PTT chrome**, same as gold.  
3. Real process issue: **locked `video-wall.js` changed after gold** without a pin-restore that included it.  

Reply **A**, **B**, or **C** (exact phrases above for A/B).
