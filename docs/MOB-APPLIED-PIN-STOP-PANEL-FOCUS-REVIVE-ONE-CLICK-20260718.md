# MOB APPLIED — pin-stop-panel-focus-revive-one-click

**Date:** 2026-07-18  
**APPLY:** `MOB-APPLY pin-stop-panel-focus-revive-one-click`  
**Prior disc:** `MOB-DISC-PIN-STOP-PANEL-CLICK-NO-REVIVE-DOUBLE-LIVE-20260717.md`

## Mandate (this APPLY only)

After pin **Stop live**, clicking the **live panel** must revive pin; pin **▶ Live video** must work in **one** click.  
**No** dock/fan, mute, CallMic, Soft Open picture, toilet/BWC-stop changes.

## What changed

| Piece | Change |
|-------|--------|
| `focusMapPinQuiet` | `clearPinVideoUserStop` **before** expand / play |
| `playSlot` | Clear user-stop before assign / focus |
| Pin Play / box click (capture) | Clear user-stop **before** `playOnMapPopup` (kills 2-click race) |
| Cache | `video-wall.js?v=20260718-pin-stop-panel-revive` |

## Not touched

- `assignColocatedPinPopupDocks` / pin-goes-up  
- mute sticky  
- `liveStreamPool` / BWC-stop  
- Soft Open WVP/ZLM  

## Operator

1. Hard refresh `http://192.168.1.38:3988`  
2. Chin Live (panel + pin)  
3. Pin **Stop live** → panel stays live  
4. Click **panel** (not Play) → pin should come back  
5. Or: pin Stop → **▶ Live video** once → pin live  

Reply: revive **PASS** / **FAIL**.

---

## Why revert still needs so many fixes (honest)

| Hope | Reality |
|------|---------|
| “Revert Soft Open = working Fleet again” | Soft Open **UI coupling** (sticky pin user-stop, fan/dock, spare-wall) was layered on classic pin. Storm restore put wall/player back toward HEAD — **not** a full return to Firmware Gold pin UX, and **not** a wipe of every Soft Open band-aid / missing APPLY |
| “Paper APPLY = fixed” | `softopen-panel-play-clears-pin-user-stop` was **claimed** but **never in** `focusMapPinQuiet` / `playSlot` on the tree you run — paper ≠ bits |
| “Gold has no bugs” | Toilet call-back latch was **inside Gold** (`dashboardActive` after BYE). Revert Soft Open ≠ fix that |
| Patch again and again | Each Soft Open MOB fixed one coupling and left another. **Freeze Soft Open UI** after this genre; next spend on WVP/ZLM health, not more pin chrome |

**Stopping the patch loop:** after you PASS this + (optional) named pin-dock APPLY, **stop Soft Open UI MOBs** unless you explicitly open that genre again.
