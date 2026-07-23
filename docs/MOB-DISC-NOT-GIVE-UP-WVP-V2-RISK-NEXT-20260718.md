# MOB DISC — Not giving up on WVP · v2 risk · next

**Date:** 2026-07-18  
**Status:** LOCK with APPLY `wvp-thin-picture-v2-failopen-fleet`  
**Ask:** Why ask me to give up? 2 days work · yesterday PASS · classic then put WVP back. Suggest / next / risk.

---

## Clear: we are **not** giving up

| Phrase | Meaning |
|--------|---------|
| `park wvp` | **Optional exit only** if *you* want to stop — **not** the plan |
| Classic undo | Put out the fire from broken v1 — **keep the 2-day work** |
| v2 APPLY | **Continue** WVP→ZLM the right way on classic floor |

Going classic first was **stepping stone**, not surrender. Same plan you locked: keep work → classic PASS → put WVP back clean.

---

## What v2 is (vs broken v1)

| | v1 (hurt you) | v2 (now) |
|--|---------------|----------|
| Fleet INVITE | **Skipped** for Chin | **Always on** |
| If WVP fails | No picture | **Keep FFmpeg** |
| Soft Open UI | Frozen | Still frozen |
| Goal | Chin WVP→ZLM when ready | Same — without black hole |

Yesterday’s Soft Open dual soak proved WVP→ZLM **can** work. v1 failed because it blocked Fleet before WVP was ready. v2 keeps Fleet.

---

## Risk (honest)

| Risk | Likely | What you see |
|------|--------|--------------|
| WVP `startPlay` still fails (Chin not on WVP GB) | **Medium–high today** | Classic FFmpeg still works · log `wvp_startplay_failure` · **fail-open OK** |
| Busy Here 486 (Fleet + WVP both invite) | Medium | Stay on FFmpeg · no black from skip |
| Soft Open UI regress | Low | Not touching Soft Open chrome |
| Break classic live again | **Low** if Soft Open-only stays 0 | If live dies → undo APPLY / classic flags |

**Pass for this MOB is not “must see ZLM today.”**  
Pass = **live always works** (Fleet) + log shows either `wvp-zlm primary` **or** honest `wvp_startplay_failure` with picture still OK.

If only fail-open: next named step = **WVP sees Chin** (WVP UI online / dual GB) — **not** Soft Open patches.

---

## You do after APPLY

1. `RESTART-FLEET.bat`  
2. `http://localhost:3988` → open **Chin only**  
3. Expect: **picture within seconds** (classic at least)  
4. Reply one of:
   - `v2-fleet-ok-zlm-yes` — log will have `wvp-zlm primary` · `v2:true`
   - `v2-fleet-ok-zlm-no` — picture OK, WVP not yet (expected if Chin not on WVP)
   - `v2-live-dead` — regression (we undo immediately)

**No rekey in this MOB.**

---

## After your report

| You say | Next |
|---------|------|
| `v2-fleet-ok-zlm-yes` | Soak / optional kk later |
| `v2-fleet-ok-zlm-no` | Named topology: prove Chin on WVP UI `:18080` or dual-GB disc — **continue**, not give up |
| `v2-live-dead` | Instant undo to classic flags |

---

**One line:** Not giving up — classic was the floor; v2 puts WVP back with Fleet fail-open; park was never the mandate.
