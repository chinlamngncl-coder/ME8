# MOB DISC — Pin Stop → click panel → pin dead · Live video needs 2 clicks

**Date:** 2026-07-17 ~23:58  
**Status:** DISC — paper only — **no code**  
**Operator:** Stop video on pin → click panel → pin does not come back; must click **Live video** twice. SIGH — again and again more problem more patching.  
**Evidence:** Screenshot — wall Chin **live**; pin shows **“Stopped — press ▶”** + Live video / Call / PTT.

**Search:** `pin Stop panel click`, `double Live video`, `pinVideoStoppedByUser`, `focusMapPinQuiet`

---

## Short verdict (accept operator)

| Step | What you see | Code truth |
|------|--------------|------------|
| Pin **Stop live** | Pin stopped; panel keeps picture | Correct spare-wall design |
| Click **panel** (not Play) | Pin stays “Stopped — press ▶” | **Bug** — sticky user-stop not cleared |
| **Live video** ×1 | Often still stopped | **Bug** — clear runs **after** play (capture vs bubble) |
| **Live video** ×2 | Pin comes back | Second click finds flag already cleared |

Not arguing. Same Soft Open pin-coupling class — not a new GPS issue.

---

## Intended product

| Action | Expect |
|--------|--------|
| Pin Stop | Pin chrome off / minimize; **panel stays live** |
| Click live panel / focus Chin | Pin should **come back** (remirror / live) while panel already live |
| Pin **▶ Live video** | One click resumes pin |

---

## Root cause 1 — sticky `pinVideoStoppedByUser`

```
stopPinLive → markPinVideoUserStop(camId)
```

Almost every revive path then **returns early**:

```
playMapPinVideoIfPopupOpen → if (pinStoppedByUser(camId)) return;
attachMapPopupPlayer     → if (pinStoppedByUser(camId)) return false;
```

### Click panel (your exact path)

```
slotEl click (not a button)
  → selectSlot
  → focusMapPinQuiet(camId)
  → playMapPinVideoIfPopupOpen(..., { forceLive: true })
```

**`focusMapPinQuiet` does NOT call `clearPinVideoUserStop`.**  
So with panel already live, clicking the panel only focuses — pin stays **Stopped**.

Matches screenshot: panel live + pin “Stopped — press ▶”.

---

## Root cause 2 — Live video needs two clicks

Two listeners on pin Play:

| Order | Who | What |
|-------|-----|------|
| 1 (capture) | `video-wall.js` `bindMapPinVideoClick` | `playOnMapPopup(..., userPlay: true)` → hits `pinStoppedByUser` → **abort** |
| 2 (bubble) | `dashboard-boot.js` | `clearPinVideoUserStop` on `.map-pin-play` |

First click: play runs **before** clear → fail; clear still runs → flag off.  
Second click: play succeeds.

---

## Why “we already patched this” still fails

Paper APPLIED earlier tonight:

`MOB-APPLIED-SOFTOPEN-PANEL-PLAY-CLEARS-PIN-USER-STOP-V1.md`  
claimed: `playSlot` + `focusMapPinQuiet` clear user-stop.

**Working tree + HEAD check:** `clearPinVideoUserStop` appears in **`prepareOpenAllLive` only** — **not** in `focusMapPinQuiet` / `playSlot`.

So that Soft Open APPLY is **missing / lost** (never landed on the file you run, or wiped by Soft Open storm restore from HEAD). Document said fixed; **runtime still broken**.

Tonight’s BWC-stop / toilet APPLY did **not** invent this sticky flag — it predates; Soft Open spare-wall / user-stop coupling owns it.

---

## Fix one → another (honest)

| Patch genre | Side effect |
|-------------|-------------|
| Soft Open pin Stop spare wall | Introduced / leaned on sticky user-stop |
| Soft Open “panel play clears stop” | Claimed APPLY — **not present** in tree now |
| BWC-stop no call-back | Separate latch; not this panel-click path |
| Pin dock / fan | Separate “pin goes up” DISC |

More Soft Open UI band-aids without verifying the clear landed = **again and again**.

---

## Candidate APPLY (only when you name it)

Suggested name: **`MOB-APPLY pin-stop-panel-focus-revive-one-click`**

Scope (narrow):

1. `focusMapPinQuiet` + `playSlot`: `clearPinVideoUserStop` **before** pin play/sync  
2. Pin **▶ Live video**: clear user-stop **before** `playOnMapPopup` (same handler, no race)  
3. Cache bust `video-wall.js` only — **no** dock fan freestyle, **no** mute, **no** CallMic  

Pass: Stop pin → click panel → pin live in **one** panel click; Live video works in **one** click.

---

## Lock

- No code until you say the APPLY name.  
- Do not bundle with pin-goes-up or mute unless you list them.  
- Soft Open UI freeze still recommended after this genre.

**Related:**  
`MOB-DISC-SOFTOPEN-PANEL-PLAY-PIN-STUCK-SIGNAL-LOST-20260717.md`  
`MOB-APPLIED-SOFTOPEN-PANEL-PLAY-CLEARS-PIN-USER-STOP-V1.md` (claimed — **missing in tree**)  
`MOB-DISC-PIN-GOES-UP-FIX-ONE-BREAK-ANOTHER-20260717.md`

**One line:** Pin Stop sticky flag blocks panel click revive; Live video double-click = clear-after-play race; Soft Open “clears user-stop” APPLY not actually in `focusMapPinQuiet` / `playSlot`.
