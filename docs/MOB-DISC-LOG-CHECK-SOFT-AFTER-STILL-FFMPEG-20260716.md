# MOB DISC — Log check while you ran (~22:20): soft-after on, **still not ZLM**

**Status:** LOCKED 2026-07-16 ~22:21  
**Search:** `check log now`, `running now`, `soft after result`  
**APPLY in play:** `mob-wvp-zlm-soft-after-ffmpeg-failopen-v1`

---

## Verdict (one line)

**You have picture from Fleet. Soft ZLM tried and failed. Not WVP-ZLM yet.**

Proof: **0** × `live broker wvp-zlm primary`.

---

## What the log shows (your run)

| Time | What |
|------|------|
| 22:20:25–27 | Fleet **invite accepted** for chin + kk → normal panel path working |
| 22:20:39+ | Soft probe: `live broker fallback` · reason **`wvp_startplay_failure`** |
| same | `live broker zlm probe idle` · pool already live (fail-open) |
| whole window | **`wvp-zlm primary` = 0** |

So soft-after behaved correctly:

1. Fleet first (you keep video)  
2. Then try WVP-ZLM  
3. WVP play failed → **stay Fleet** (not black)

---

## What **you** do now

| Do | Don’t |
|----|--------|
| Keep using normal panel if you need video | Open lab two-box |
| Say picture **pass** or **fail** (Fleet) | Change SIP / 5061 |
| Nothing else for ZLM tonight unless you open a new named MOB | Wait for refresh to “fix” ZLM |

ZLM is **not** on. Soft-after did not hurt your Fleet path.

---

## What **agent** must do next (not your homework)

WVP `startPlay` still fails while Fleet invite works.  
That is the scale blocker. Agent owns the next named MOB (stack / device reachability for WVP play) — **without** invite-hold, **without** dictating 5060 rewrite.

Suggested next when you say go: keep chasing startPlay success until log shows `wvp-zlm primary` on the **normal panel**.

---

## One line

**Soft-after PASS as fail-open. ZLM PASS = no. Video = Fleet. Next = agent fix startPlay.**
