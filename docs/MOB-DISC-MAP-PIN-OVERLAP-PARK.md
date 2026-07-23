# MOB DISC — Pin “Overlapping”: stop the patch merry-go-round

**Status:** **SUPERSEDED** 2026-07-10 — user reports ops still stacking; see `MOB-DISC-MAP-PIN-STACK-STILL-BROKEN.md`  
**Search:** `Overlapping`, `park pin stack`, `no more pin patch`, `FR off soak`  
**Superseded by:** `MOB-DISC-MAP-PIN-STACK-STILL-BROKEN.md` (unpark + `mob-map-pin-fan-2`)

---

## Note

Earlier park assumed “video OK ⇒ ignore Overlapping HUD.” Operator rejected that: **panels still stack after Fleet restarts.** Do not use this park SOP for new work.

---

## What “working fine” meant (lock this)

| Pass means | Does **not** require |
|------------|----------------------|
| Open All → Chin + kk **live video** on wall + pins | HUD never says “Overlapping” |
| Stop / Stop All cleans streams | Zero GPS colocated pins |
| Drag chips / headers if panels sit close | Another layout MOB every time the blue bar appears |

The blue HUD is a **helper** (“select chip, drag”).  
**“Overlapping”** = rects still touch (honest).  
**“Stacked nearby”** = dock cleared rects.  

Both can appear with **working** video. Treating the word “Overlapping” as a P0 regression is what restarts endless patching.

---

## Then what shall we do? (locked SOP)

### 1. Default: **PARK pin layout**

- **No** `mob-map-pin-fan-2`, clamp, or relayout MOB.  
- **No** more “is it GPS?” / “did FR break dock?” loops unless below.  
- Continue **FR genre** (Watchlist dossier, etc.) on its own track.

### 2. Optional **one** soak (only if you still care) — then stop

| Step | Action |
|------|--------|
| A | FR **off** · Open All Chin+kk · wait ~2s |
| B | Note HUD: Overlapping **or** Stacked nearby |
| C | Confirm **video** on both pins/wall — yes/no |

| Result | Do |
|--------|-----|
| Video OK (HUD either wording) | **Park forever** for this topic. Ignore HUD wording. |
| Video OK + HUD Overlapping | Same — **park**. Optional later: soften copy to always “Stacked — drag” (cosmetic only, low priority). |
| Video **broken** / one pin stuck / Open All fails | Then **one** ops MOB — not FR. Name it from the failure, not from the HUD word. |
| FR on breaks video that was OK with FR off | Capacity / dual-surface — separate DISC; still not “rewrite dock.” |

**You do not owe us the soak.** If ops feels fine, skip it and stay parked.

### 3. What we will **not** do

- Patch pin dock “just in case” after every FR MOB.  
- Blame offline UB-6A5G for Chin+kk HUD.  
- Re-open pin layout because Analytics Watchlist work landed.  
- Stack MOBs: fan + clamp + FR + offline TTL in one pass.

---

## If it “felt worse” after FR (honest, no patch)

Most likely **not** deleted layout:

- Same colocated lab GPS + large live panels → HUD often honest.  
- FR on + Open All = more live load → slower settle; HUD may linger on Overlapping longer.  
- Attention bias: looking for overlap after FR session.

None of that justifies another layout rewrite if **video still works**.

---

## Offline pin TTL

Still a **separate** parked product idea (`MOB-DISC-FR-OPENALL-OVERLAP-OFFLINE-PIN.md`).  
Do **not** couple to pin-dock. Apply only when you name that MOB.

---

## Bottom line

| Question | Answer |
|----------|--------|
| Soak then what? | If video OK → **park**. If video bad → **one** ops fix. |
| Keep patching pin stack? | **No.** |
| Was it fine before FR? | **Yes for video** — that remains the bar. |
| FR genre next? | Yes — e.g. Watchlist dossier when you say MOB-APPLY. |
| Pin Overlapping topic? | **PARKED** unless Open All / pin **video** fails. |

No apply from this DISC.
