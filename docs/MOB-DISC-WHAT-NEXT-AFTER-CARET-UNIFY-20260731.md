# MOB DISC — What’s next after caret unify PASS (2026-07-31)

**Date:** 2026-07-31  
**Status:** DISC only — **no code until** named `MOB-APPLY`  
**Operator:** Caret unify PASS (“good. nice work”). What is next?

---

## Just finished (this genre)

| MOB | Result |
|-----|--------|
| ANPR subnav stay on ANPR | PASS |
| Plate lists + listMatch on snapshot read | Done earlier |
| Select caret overlay → unify all UI | PASS (clicks OK) |

UI dropdown affordance is **not** the next product gap. Stop polishing chrome unless something breaks.

---

## Honest ANPR product status

| Have | Still missing |
|------|----------------|
| Snapshot / crop / Read plate | **Live BWC ANPR** (ZLM sample, low FPS) |
| Plate lists + match badge on read | Offline video plate path |
| Engine health pills | FR-style **hit toast / HQ** when list matches (live or still) |
| Dark compact selects + caret | Pack sidecar like FR · manuals after PASS |

Snapshot + lists ≠ full FR-style ANPR. Locked plan already said that.

---

## Recommended next (one path)

**Do live ANPR next — lists are ready to receive hits.**

Live without lists was wrong (we fixed that).  
Lists without live = photo-only desk tool.  
Live + lists = BWC corridor watch like Face live tiles.

### Named APPLY when you want code

**`ANPR-LIVE-ZLM-WATCH-V1`**

| In | Out |
|----|-----|
| Analytics ANPR live watch from **existing WVP/ZLM** play (no second BWC invite storm) | New video stack / turn handoff off |
| Low FPS sample → detect/OCR → **plate list match** | Full wall matrix rewrite |
| Cap concurrent cams · license gate | Offline video in same MOB |
| Hit toast / alert surface (FR-like); **no** auto Ops storm from investigation-style sources | Manuals / ship pack in same MOB |

**PASS (operator):** pick a live BWC on ANPR → plate on list appears as hit (toast or clear alert) while camera moves in frame — without killing Ops/wall.

**Architecture already locked:** `MOB-DISC-ANPR-ZLM-WORKER-STREAM-FANOUT-20260729.md` — consumer of ZLM, not a second uplink to the camera.

**After live PASS:** offline video path + alert-only parity (`ANPR-OFFLINE-HIT-ALERT-ONLY-V1` when that path exists) · then pack/manuals.

---

## Not next (park)

- More select/CSS unify unless regression  
- Weapon module  
- Manuals before live ANPR PASS  
- Inventing dual customer ports (ship stays one HTTPS face)

---

## APPLY line

```
MOB-APPLY ANPR-LIVE-ZLM-WATCH-V1
```

No code in this disc. Say that when ready — or name a different next if you override (e.g. ship pack only).
