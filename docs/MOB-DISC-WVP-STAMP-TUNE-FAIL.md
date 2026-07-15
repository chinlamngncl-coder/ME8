# MOB DISC — Stamp-tune soak FAIL at ~2 min (A lag, B stop/play)

**Status:** LOCKED — **FAIL** — do not keep soaking  
**Date:** 2026-07-14 ~20:26  
**Search:** `modifyStamp fail`, `A lag`, `B stop play`, `restart fleet?`

---

## Operator report (fact)

- ~**2 minutes** in — already broken enough to stop  
- **Tile A:** suddenly **lags a lot**  
- **Tile B:** keeps **stop and play** (reopen loop)  
- Asked: restart Fleet?

**Verdict: FAIL.** Do not sit through 30 min. Do not call stamp-tune a win.

---

## Restart Fleet? **No**

| Change | Needs Fleet restart? |
|--------|----------------------|
| WVP bundled ZLM `config.ini` (stamp-tune) | **No** — only `me8-wvp` recreate (already done) |
| Fleet Node / tiles JS | Only if we change ME8 server/JS |

You do **not** need to restart Fleet for this ZLM tune. Refresh dashboard / re-Play is enough after WVP came back.

---

## What we changed (stamp-tune) vs what you saw

| Tune | Intended | What you saw |
|------|----------|--------------|
| `modifyStamp` **0 → 1** | Calm stamp spam / snap delay | **A lag spike** — classic risk of stamp rewrite; **likely the lag culprit** |
| Longer none-reader / keepAlive / RTP timeout | Fewer tear-downs | **B still stop/play** — did **not** fix player drop |
| Reopen still on | Lab safety net | Makes B look like “stop then play” |

So: **tune did not stabilize B**, and **probably made A worse**.

That matches the earlier warning: Google’s stamp advice is **not free** — on this 2021 bundled ZLM it can **hurt** live feel.

---

## Honest conclusion

1. **`mob-wvp-bundled-zlm-stamp-tune` = FAIL** — revert stamp first.  
2. Reopen is still a **patch** — B stop/play proves root player/path not fixed.  
3. 2-cam desk + old all-in-one ZLM is **not** “we’re almost at thousands.”  
4. Next real root is **not** more ini knobs until stamp is back to **0**.

---

## Next APPLY (when you say go) — one step

**`mob-wvp-bundled-zlm-stamp-revert`**

- Set `modifyStamp` back to **0** (general + rtmp)  
- Keep or drop the longer keepalive/none-reader (optional: keep timeouts; **must** revert stamp)  
- Recreate `me8-wvp` only  
- Re-Play — if A lag gone, that confirms stamp=1 caused it  

After revert: **stop chasing Google stamp.** Next genre = **player / split ZLM**, not another stamp experiment.

---

## Forbidden

- Another long soak while A lags and B loops  
- Claiming stamp-tune PASS  
- Restarting Fleet “just in case” for this  
- More reopen as the answer  

---

## Related

- Proper scale: `docs/MOB-DISC-WVP-PROPER-SCALE-NOT-TWO-CAMS.md`  
- APPLIED (failed soak): `docs/MOB-APPLIED-WVP-BUNDLED-ZLM-STAMP-TUNE.md`  
- Reopen ≠ stable: `docs/MOB-DISC-WVP-REOPEN-IS-PATCH-NOT-STABLE.md`
