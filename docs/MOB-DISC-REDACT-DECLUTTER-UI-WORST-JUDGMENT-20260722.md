# MOB DISC — Redact declutter UI: operator judgment (worst-in-class)

**Status:** Superseded for escalation — see **`MOB-DISC-REDACT-UI-WORST-OF-WORST-JUDGMENT-20260722.md`**  
**Phase 1 APPLIED:** `MOB-APPLIED-REDACT-CLEAN-DRAFTS-HONEST-ERROR-V1-20260722.md`  
**Next:** `MOB-APPLY REDACT-PRIOR-EXPORTS-CLEAR-FINALIZED-V1`  
**Search:** `worst UI`, `shit UI`, `confusing redact`, `cant clear`, `IT vs super`, `dead loop`  
**Trigger:** Operator after Clean drafts alert + 9 drafts banner: “top worst UI I saw in my life”  
**Genre:** Evidence redact **declutter / error voice** (not face quality, not WVP)

---

## Straight verdict

| Claim | Truth |
|-------|--------|
| Your anger is overblown | **No.** For declutter / clear drafts, this UX **failed the desk.** |
| “Contact IT administrator” while **Super admin** is on screen | **Indefensible** — wrong audience, wrong message |
| Dismiss next to Clean drafts | **Trap** — sounds like clear; does not delete |
| Generic browser `alert` with no next step | **Amateur** for a custody product |
| 9 drafts pile from Save-again history | **Product debt** we created; UI did not give a trustworthy way out |
| Whole Evidence product is trash | **Overclaim** — Download / Finalize / fill-layout MOBs improved pieces; **this banner+error path is the shame** |

**Agent owns this mess.** Operator should not need a decoder ring to delete draft redacts.

---

## Why it feels like the worst UI (named harms)

| # | Harm | What you hit |
|---|------|----------------|
| H1 | **Role insult** | Badge: Super admin · Alert: call IT |
| H2 | **False twin buttons** | Dismiss ≠ Clean drafts; labels don’t say so |
| H3 | **Silent failure** | Clean fails → `errors.generic` → zero useful text |
| H4 | **Dead-loop feel** | Alert → OK → still “9 drafts” → same click again |
| H5 | **Browser modal** | Blocks the page; no inline fix path |
| H6 | **Restart tax** | Cleanup API needed restart; UI never said “restart server” |
| H7 | **Prior pile** | Years of Save-again drafts with no trustworthy clear until late MOB |

Related earlier shames (same genre, partly fixed): Finalize bounce loop, Download buried, 280px Redacted exports box. Those APPLIED. **H1–H6 are still open** until the next APPLY.

---

## What is *not* the right response

- Park Evidence / rebuild a new app  
- Blame the operator for clicking Dismiss  
- Another book of MOBs without one next APPLY  
- Soften the judgment (“it’s okay for a lab”)  

---

## Single next path (risk pick)

**Only next code MOB:**

### `REDACT-CLEAN-DRAFTS-HONEST-ERROR-V1`

Already scoped in:  
`MOB-DISC-REDACT-CLEAN-DRAFTS-IT-VS-SUPER-DEAD-LOOP-20260722.md`

Must land:

1. Clean drafts / Remove: **honest** failure text (restart / not found / failed delete) — **never** “contact IT” for Super admin on this action.  
2. Dismiss: label/hint **“Hide for now — does not delete drafts.”**  
3. On success: drafts actually gone; banner count truthful.  
4. Prefer inline error on the banner over naked `alert` where easy.  
5. Cache bust + verify Clean with restart already done.

**After that PASS:** stop. Do not chain more chrome until you say the declutter path feels human.

Optional later (not today): app-wide Super-admin-aware `errors.generic` — separate genre.

---

## Operator now (before APPLY)

1. Restart server if not already (so cleanup API exists).  
2. Ctrl+F5 → **Clean drafts** (ignore Dismiss for declutter).  
3. If still generic alert → apply the MOB above; do not keep clicking into the wall.

---

## Ask

**`MOB-APPLY REDACT-CLEAN-DRAFTS-HONEST-ERROR-V1`**
