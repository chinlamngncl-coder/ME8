# MOB DISC — Open grabbed must show video **on the POI pin** (agent wrong; corrected)

**Date:** 2026-07-24  
**Status:** APPLIED — `TACTICAL-OPEN-GRABBED-PIN-POPUP-LIVE-V1` (await eyes PASS/FAIL)  
**Supersedes:** `MOB-DISC-OPEN-GRABBED-PANEL-NOT-PIN-CONCEPT-20260724.md` (**WRONG** — retract)

---

## Agent error (own it)

Agent told you Open grabbed = wall panel only and “pin video out of scope.”  
**That was wrong.** You already have the product face:

> When you place / open a POI, a **video panel pops on the pin**.

That is `TACTICAL-MAP-AR-POI-V1`: **Open linked** → open pin popup + `startPopupLive` (FLV in the pin bubble), and may also hit a wall slot.

**Open grabbed** is meant to be the **same idea under pressure** — grab many → those pins **open with video on the pin** — not “ship silent black panels and call the pin path out of scope.”

Wall panels can still be used as **extra** capacity; they are **not** the substitute for pin video.

---

## Locked concept (corrected)

| Surface | Role |
|---------|------|
| **POI pin popup** | Primary live view for Tactical AR (“video panel on the pin”) |
| **Open linked** | One pin → popup live (+ optional wall) |
| **Open grabbed** | Many pins / cams in circle → **same pin-popup live path** for POIs in the grab (cap still 8), not wall-only |
| **Ops wall panel** | Spill / Open All style backup — **not** the definition of success for this genre |

Prepare / Operate **mode flow** PASS still stands (banner, Grab vs Place, Esc).  
What **failed the product intent** of circle-open: grabbed open went to **panel**, and you got **no picture on the pin** (and panel black).

---

## Gap in code today (facts)

| Action | Pin popup FLV | Wall |
|--------|---------------|------|
| **Open linked** (fixed) | Yes — `openPopup` + `startPopupLive` | Also tries panel 9+ |
| **Open grabbed** | **No** — never opens pin stages | Yes — `openAllLivePins` / `openOnWall` only |

So your eyes match the bug: BWC “called” to panel, **no video on pin**, because Open grabbed never drove the pin popup path.

Black panel is still a live/WVP harm when wall is used — but the **Tactical concept fix** is: drive **pin popup live** for grabbed POIs (parity with Open linked).

---

## What mode-flow V1 did / did not do

| Done (PASS) | Not done (this Disc) |
|-------------|----------------------|
| PREPARE / OPERATE exclusive modes + banner | Open grabbed → pin popup video |
| Grab circle UX | FLV prove on each grabbed pin |
| Loud toast when empty / opened | Fix black wall as the primary success metric |

Do **not** reopen mode-flow for this. New MOB below.

---

## Recommended next APPLY (one)

**`TACTICAL-OPEN-GRABBED-PIN-POPUP-LIVE-V1`**

Scope:

1. For each POI inside the grab circle (respect cap 8): open its pin popup and start live the same way as **Open linked** (fixed → `startPopupLive`; BWC → define one clear path — prefer pin stage if we have a BWC-in-popup path, else wall only for that id and toast).  
2. Toast: opened N on pins / wall spill / nothing / fail.  
3. Do **not** claim PASS if only black wall panels and pin bubbles stay empty.  
4. Out: Turf, dual-pane PiP, mode-banner rework.

**Ladder note:** Insert **before** Turf while Tactical video-on-pin is the open wound. Turf waits one slot.

---

## Do not

- Say again that pin video is “out of scope” for Open grabbed  
- Ask for another “DISC OK / confirm” on this point — **locked here**  
- Bundle Turf + pin-popup + dual-pane in one APPLY  

---

## Next command

`MOB-APPLY TACTICAL-OPEN-GRABBED-PIN-POPUP-LIVE-V1`

Until APPLY — **zero code**.
