# MOB-APPLIED: mob-wvp-zlm-soft-after-ffmpeg-failopen-v1

**Date:** 2026-07-16  
**Status:** APPLIED  
**Named file:** `public/js/video-wall.js`  
**Cache:** `video-wall.js?v=20260716-soft-after-ffmpeg-failopen`  
**Why:** `docs/MOB-DISC-WVP-ZLM-SCALE-NOT-FUN-NOT-AGENT-PARK.md`  
**Why not invite-hold:** `docs/MOB-DISC-WHY-REVERT-THEN-SOFT-AFTER.md`

---

## Goal (scale)

Put **WVP-ZLM** back on the **normal panel** wall without blacking ops:

1. Fleet INVITE + JSMpeg **first** (picture)  
2. Soft ZLM overlay **after**  
3. ZLM fail → **keep Fleet** (fail-open)  
4. Multi-cam / Open All **allowed** (big qty path)

## Code

| Piece | Behavior |
|-------|----------|
| `wallZlmSoftUpgradeAllowed` | Helpers present → **true** (multi-cam OK) |
| `scheduleWallZlmSoftUpgrade` | Delay ~1.8s + slot stagger; `noFfmpegStart`; 3 tries; prove 6s |
| Invite order | **Unchanged** — immediate Fleet (no ZLM-before-invite) |

## Operator (plain)

1. Hard refresh normal desk once.  
2. Open live / wall like always (not lab two-box).  
3. Wait a few seconds after picture.  
4. Pass/fail from picture.  
5. Agent checks log for `live broker wvp-zlm primary`.  
   - **0** of that line → still Fleet underneath (ZLM not proven) — say so honestly.  
   - Line present → WVP-ZLM path engaged.

## Honesty

If WVP still has **no online devices**, soft-after will **fail-open to Fleet**. That is not “park forever” — next agent work is making startPlay succeed **without** asking you to rewrite SIP 5060.

## Not changed

- Pin canvas mirror / Firmware Gold pin rules  
- SIP **5060**  
- Lab two-tile page (not for operator)
