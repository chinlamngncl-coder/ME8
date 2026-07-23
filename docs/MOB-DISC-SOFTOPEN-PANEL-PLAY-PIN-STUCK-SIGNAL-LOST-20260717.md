# MOB DISC — Panel Play does not revive pin · dual Soft Open unstable / signal lost

**Date:** 2026-07-17 ~21:50  
**Status:** DISC only — no code  
**Operator:**
1. Stop pin → stop panel → panel **Play** → **pin does not play** (wrong vs prior design).  
2. Two BWCs Soft Open started; **video signal lost** on one; feels unstable — check log.

---

## 1) Panel Play vs pin — intended vs actual

### Intended (product / prior design)

| Step | Expected |
|------|----------|
| Pin **Stop live** | Pin chrome off + minimize; **panel keeps playing** (pin-stop-spare-wall) |
| Panel **Stop** | Wall + pin session end (WVP stopPlay) |
| Panel **Play** again | Wall Soft Open again **and** pin should reopen / remirror (same as fresh Soft Open / Open All) |

### Actual (code — root cause)

Pin Stop sets a sticky flag:

```
stopPinLive → markPinVideoUserStop(camId)
```

Almost every pin revive path then **bails**:

```
playMapPinVideoIfPopupOpen → if (pinStoppedByUser(camId)) return;
syncMapPopupPlayer → if (pinStoppedByUser) return;
quietSoftOpenPinResync → if (pinStoppedByUser) return;
```

Panel Play path:

```
playSlot → assignCamToSlot (Soft Open) → focusMapPinQuiet
         → playMapPinVideoIfPopupOpen({ forceLive: true })
```

**`playSlot` / Soft Open `onProven` do not call `clearPinVideoUserStop`.**  
Only Open All (`prepareOpenAllLive`) and explicit pin **Play** / expand clear that flag.

Also `stopSlot` calls `dismissMapPinPopup` — pin may be closed. Panel Play tries `focusMapPinQuiet` to reopen, but even if popup opens, **user-stop flag still blocks mirror**.

### Verdict

| Claim | Result |
|-------|--------|
| Pin Stop must spare panel | Still correct (spare-wall MOB) |
| Panel Play after pin Stop must revive pin | **Broken** — sticky `pinVideoStoppedByUser` |
| Soft Open prove remirrors pin | Blocked by same flag after earlier pin Stop |

**Candidate APPLY (later):** `mob-softopen-panel-play-clears-pin-user-stop-v1`  
- `playSlot` / Soft Open `onProven` / wall Play: `clearPinVideoUserStop(camId)` before `focusMapPinQuiet` / pin sync.  
- Keep flag only until **panel** Stop or explicit pin Stop without wanting auto-revive (or clear on panel Play only — your call).

---

## 2) Dual Soft Open + signal lost — log read

`storage/fleet.log` Media (Soft Open window tonight):

| Time (+08) | What |
|------------|------|
| **21:09:22–26** | KK `…0009` **`wvp_startplay_failure` / Busy Here `486`** (×3) — WVP says cam busy |
| **21:09:53 / 21:10:02** | Chin + KK `wvp-zlm primary` |
| **21:10:10–29** | Stops Chin then both |
| **21:34:36–43** | Dual Soft Open again — **several** `wvp-zlm primary` for same cams in seconds (descriptor storm / multi-fetch) |
| **21:36:34–35** | Stop KK then Chin |
| **21:36:39 / 41** | Soft Open Chin + KK again |
| **~21:36 → 21:46** | ~10 min session then Chin stop / brief replay / stop |
| **21:49:25** | KK stop |

**No server line literally says “video signal lost.”** That OSD is **client Soft Open**:

```
same-URL recover ×8 exhausted → softOpenRecoverExhaustedUi → ensureSignalLostOverlay
```

So: one cam shows **signal lost** while the other may still be Live = **viewer recover gave up** on that slot (or earlier Busy Here left a bad session), **not** necessarily Fleet BYE for both.

### Instability sources (stacked tonight)

| Source | Evidence |
|--------|----------|
| WVP **486 Busy Here** | KK startPlay fail before clean dual |
| Multi `wvp-zlm primary` in &lt;1s | Duplicate Soft Open / Open All / prove fetches — not one clean StartPlay |
| Same-URL recover → signal-lost OSD | Kill-reopen-storm band-aid when FLV keeps dying |
| Pin user-stop sticky | Feels “broken” after Stop pin / Stop panel / Play panel |
| Status poll spam | Heavy DeviceStatus noise in log (separate; not Soft Open picture) |

---

## 3) What is wrong vs what is working

| Area | Status |
|------|--------|
| Soft Open picture path (WVP ZLM) | Works when startPlay succeeds |
| Pin Stop ≠ panel BYE | Applied (spare-wall) |
| Panel Play → pin revive | **Logic FAIL** (user-stop flag) |
| Dual Soft Open soak | Fragile — Busy Here + recover exhausted → signal lost UI |
| Kill reopen storm | Stops broker storm; still leaves **Weak Signal / signal lost** after 8 recovers |

---

## 4) Suggested APPLY order (you choose)

| # | MOB | Why |
|---|-----|-----|
| **1** | `mob-softopen-panel-play-clears-pin-user-stop-v1` | Restore: panel Play / Soft Open prove clears pin user-stop and remirrors |
| **2** | Soft Open Busy Here / single startPlay discipline | Avoid 486 + multi-fetch herd (click-lock + generation help; may need WVP session reuse) |
| **3** | OSD honesty | Signal lost = “viewer lost — cam may still be live” (prior disc); optional Play retry without Stop |
| — | GB-only Soft Open soak | Optional reduce dual-protocol noise (other disc) |

---

## One line

**Pin stays dead after panel Play because pin user-stop is sticky; dual Soft Open unstable = WVP Busy Here + multi-fetch + recover-exhausted signal-lost OSD (not a missing fleet “signal lost” log line).**

---

## You

Confirm which cam showed signal lost (Chin `…0008` / kk `…0009`).  
Say **`MOB-APPLY softopen-panel-play-clears-pin-user-stop-v1`** when ready to fix the pin revive logic.
