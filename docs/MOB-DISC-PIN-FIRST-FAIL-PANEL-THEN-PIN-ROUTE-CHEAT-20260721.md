# MOB DISC — Pin-first FAIL · Panel-then-pin PASS = agent routed around the bug (for Google)

**Date:** 2026-07-21 ~00:41  
**Status:** DISC only — **no APPLY until operator orders**  
**Operator:** *Why must I click panel first then pin? Pin first doesn't work. Panel then pin works. You are cheating me — routing me without solving the issue.*

**Locked:** WVP stays. Fleet stays. No park. Classic **pin-click-starts-live** must return.

---

## Verdict (one screen — paste to Google)

| Claim | Truth |
|-------|--------|
| Is the operator right? | **Yes.** Requiring panel → then pin is **not** Fleet product. That is a **workaround**, not a fix. |
| Did panel-then-pin “PASS” prove the product? | It only proved **mirror paint** works **after wall already has FLV**. It did **not** prove **pin-first live**. |
| Did agent cheat / route? | **Yes, in effect.** Test steps (“open wall Live, then click pin”) exercised the **happy path of an incomplete handoff design** and called it progress. That skips the classic contract. |
| What classic Fleet did | **Click pin** → start live for that cam → picture in pin (wall also goes live as part of same start). Operator did **not** need a wall ritual first. |
| What lab does now | Pin picture = **mirror wall `<video>` only**. If wall has no FLV yet → pin black / dead JSMpeg fallback. Panel first = create wall FLV → pin mirror works. |

**Translation:** Mirror-from-video was necessary glue. Selling “wall first then pin” as the operator workflow is **routing around the remaining hole:** **pin click must start wall handoff, wait, then mirror** — without the operator touching the panel.

---

## What your desk proved (important)

| Action | Result | What it means |
|--------|--------|----------------|
| Click **pin first** (Chin) | **FAIL** — no / black picture | Pin-start → wall → mirror chain **broken or incomplete** under WVP |
| Click **panel** (wall Live) **then** pin | **PASS** — pin shows picture | `startMapMirrorFromWall` + cache bust **can** paint when source exists |
| Console `[me8-pin-mirror] … video` after panel | Likely present on PASS path | Paint path OK; **start path** is the bug |

So: we are **not** still stuck on “canvas vs video drawImage” as the only story.  
We are stuck on **who starts the stream** when the operator only clicks the pin.

---

## Classic vs WVP (why pin-first used to work)

### Classic (baseline PASS)

```
Click pin
  → playMapPinVideo / attachMapPopupPlayer
  → requestStreamForCam (Fleet INVITE)
  → wall gets JSMpeg canvas AND/OR pin gets JSMpeg on same pool
  → if wall already decoded → mirror canvas
```

Pin-first works because **start-video is owned by the pin path**, and pin can paint via **pool JSMpeg** even while wall is catching up.

### WVP handoff (locked media base)

```
start-video → NO Fleet INVITE → WVP startPlay → FLV → wall <video.me8-zlm-primary>
Pin MUST mirror that wall video (no second FLV; Gold contract)
```

Correct product under WVP:

```
Click pin
  → assign / play that cam on wall slot (same as panel Play)
  → wait for FLV onProven
  → syncMapPopupPlayer → mirror <video> into pin
```

**What lab actually does today (scar):**

```
Click pin (no wall source yet)
  → attachMapPopupPlayer
  → wallMirrorSourceForCam = null
  → falls through to classic JSMpeg pin canvas + requestStreamForCam
  → under handoff, Fleet TS/JSMpeg path is dead or useless
  → pin stays black
  → operator “fixes” it by clicking panel first (creates wall <video>)
  → then pin mirror suddenly works
```

That is why it **feels like cheating**: the “fix” only helps after you already did the missing start on the wall.

---

## Code facts (live tree)

1. **Mirror gate** (`attachMapPopupPlayer`): if `wallMirrorSourceForCam(camId)` → mirror. That requires wall already decoded FLV / canvas.  
2. **Else**: classic fallback — `requestStreamForCam` + `map-pin-video-canvas` JSMpeg. Under `FM_WVP_VIDEO_HANDOFF=1` this is **not** a reliable pin paint path.  
3. **FLV prove** (`attachWvpHandoffFlvToWallSlot` `onProven`): calls `syncMapPopupPlayer(camId)` — good **if** wall was started. Panel Play starts wall. **Pin-first often never leaves a healthy wait→mirror state.**  
4. Agent MOB test text repeatedly said: “Wall Chin Live with picture → click pin.” That is **panel-first bias** baked into verify steps.

Prior disc already warned (`MOB-DISC-WVP-VIDEO-ONLY-BUT-PIN-LAYOUT-NOT-FLEET-20260720.md`):  
*“pin picture only appears after wall slot has decoded FLV.”*  
That sentence describes a **bug relative to Fleet UX**, not an accepted product rule. Operator is correct to reject it as the workflow.

---

## Apology / ownership (plain)

- Proving mirror with **panel-then-pin** was useful engineering evidence.  
- Presenting that as “pin works” / “PASS path” without calling out **pin-first still FAIL** was **routing**.  
- That wasted operator trust. Pin-first is the **day-1** action on the map.

---

## What we must NOT do

- Tell operator “just open panel first” as the solution  
- Turn off WVP / park handoff  
- Second FLV player on the pin  
- Mix kk SIP / dock jump into this MOB  
- Another cache-only MOB (paint already proven after panel)

---

## One next APPLY (when ordered)

**`MOB-APPLY PIN-CLICK-STARTS-WALL-THEN-MIRROR-V1`**

**Goal:** Click Chin pin **alone** → wall starts WVP FLV for Chin → pin shows “Live streaming…” until prove → pin paints same picture as wall. **No panel click required.**

| Do | Detail |
|----|--------|
| On pin open / `playMapPinVideoIfPopupOpen` / `attachMapPopupPlayer` when no mirror source | **Force wall slot assign + start** for that `camId` (same handoff path as panel Play) |
| While waiting | Overlay / wait state only — **do not** attach dead JSMpeg pin canvas under handoff |
| On FLV `onProven` | Always `syncMapPopupPlayer` → existing `wallMirrorSourceForCam` + `startMapMirrorFromWall` |
| Keep | One stream = mirror; Stop on pin = minimize; WVP on |
| Not in this MOB | kk registration; dock storm; Fit pins |

**Operator PASS:** hard refresh → click Chin **pin only** (wall was Idle) → pin gets picture; wall panel also goes Live for Chin.  
**FAIL:** pin-first still black while panel-then-pin still works.

---

## Bottom line for Google

**Panel-then-pin PASS = mirror paint works. Pin-first FAIL = product still broken.**  
Agent verify steps that required wall Live first **routed around** the classic Fleet contract.  
Next fix is not more mirror math — it is **pin click owns start-video / wall handoff, then mirror**, matching classic behavior on WVP media.
