# MOB DISC — FR live Recent snapshots feel slow (after ZLM grab)

**Date:** 2026-07-23  
**Status:** APPLIED 2026-07-23 — see `MOB-APPLIED-FR-LIVE-SNAP-FASTER-V1-20260723.md`  
**Prior PASS:** `FR-LIVE-GRAB-ZLM-HANDOFF-V1` (snaps work again under handoff)  
**Operator:** Recent / match snaps feel slower than the designed classic pace  
**Genre:** Analytics FR live (not redaction)

---

## Straight verdict

| Claim | Truth |
|-------|--------|
| Seeta / match “broken” again | **No** — hits work; **latency** is the complaint |
| Classic design was ~mpeg1 grab ~0.9s still | **Yes** (`FM_FR_GRAB_MS` default **900**) |
| Handoff path uses that 900ms | **No** — ZLM FLV grab budget default **`FM_FR_FLV_GRAB_MS=2500`** |
| Fix = turn handoff off | **Forbidden** |
| Fix = invent new FR product | **No** — tighten grab/poll knobs on current path |

---

## Why it feels slow (math)

Per watched cam, each poll tick roughly:

1. Wait up to **`POLL_SEC`** (floor **2s**, `FM_FR_POLL_SEC`)  
2. **`BEST_FRAME_GRABS`** (default **2**) × FLV one-frame ffmpeg (worst-case **~2.5s** each) + **200ms** gap  
3. Sidecar batch represent / match  

Worst case one cam: **several seconds** before a Recent card, vs classic ~1–2s grab window.  
FLV often finishes earlier than 2.5s when a keyframe arrives — but cold ZLM / GOP wait still stretches Recent.

Also: **scored-only** rail waits for a real probe % (by design) — blank twins stay off; that can look “late” vs flooding empty crops.

---

## What we will **not** do

- Turn `FM_WVP_VIDEO_HANDOFF` off  
- Re-invite Fleet mpeg1 pool “just for FR”  
- Bundle with redaction or security MOBs  
- Blind `POLL_SEC=0` / grab so short that faces go blank again  

---

## Recommended single next APPLY

**`MOB-APPLY FR-LIVE-SNAP-FASTER-V1`**

One package, ordered inside the MOB (still one APPLY):

| Step | Change | Why |
|------|--------|-----|
| 1 | Lower default **`FM_FR_FLV_GRAB_MS`** **2500 → 1200** (clamp still allows override) | Cap worst-case ZLM still wait closer to classic |
| 2 | Allow **`FM_FR_POLL_SEC` floor 1** (today `Math.max(2,…)`) + default stay **2** or lab default **1** if CPU OK | Faster tick without forcing every lab to 1 |
| 3 | Under handoff only: default **`BEST_FRAME_GRABS=1`** (or env `FM_FR_HANDOFF_BEST_FRAME_GRABS`) | One still per tick = less serial ffmpeg; quality buffer still exists |
| 4 | One media log: `fr flv grab ms` (success duration) | Prove speed without guessing |

**Risk:** slightly more blank/no-face fails if ZLM keyframe is late → rail skips that tick (next poll retries). Acceptable vs always feeling 2–3× slower.

**Out of scope for this MOB:** motion / walk coverage denser sampling (`FR-MOTION-FRAME-COVERAGE-V1`) — that is L3 after speed PASS if still thin.

---

## Operator verify (after APPLY)

1. Restart Fleet → Ctrl+F5 → Face → Start watch.  
2. Face the cam.  

**PASS:** Recent cards feel close to pre-handoff pace (roughly **≤ ~2–3s** after face in view, not “stuck then dump”).  
**FAIL:** still multi-second dead air with tile already live → agent checks `fr flv grab ms` / `fr grab failed`.

---

## Related

| Doc | Role |
|-----|------|
| `MOB-APPLIED-FR-LIVE-GRAB-ZLM-HANDOFF-V1-20260723.md` | Snaps restored via FLV |
| `MOB-DISC-FR-KEYFRAME-BLUR-VS-GRAB-FASTER.md` | Why “faster only” can hurt quality |
| `MOB-DISC-LAB-FR-LEFTOVERS-THEN-SECURITY-20260723.md` | Stage ladder |

**Phrase when ready:** `MOB-APPLY FR-LIVE-SNAP-FASTER-V1`
