# MOB DISC — Clean drafts “dead loop” · IT admin vs Super admin · useless alert

**Status:** APPLIED 2026-07-22 — see `MOB-APPLIED-REDACT-CLEAN-DRAFTS-HONEST-ERROR-V1-20260722.md`  
**Mode:** Applied — `MOB-APPLY REDACT-CLEAN-DRAFTS-HONEST-ERROR-V1`  
**Search:** `IT administrator`, `cant clear`, `clean drafts`, `dead loop`, `Something went wrong`  
**Trigger:** Screenshot — Super admin signed in; browser alert “Something went wrong. Try again or contact your IT administrator.”; banner “9 drafts waiting” with Finalize / Clean drafts / Dismiss; operator cannot clear  
**Genre:** Evidence redact UX / error voice (not face blur quality)

---

## Straight answers

### 1) IT administrator **or** Super admin?

| Role on screen | Meaning |
|----------------|---------|
| **Super admin** (blue badge — you) | Highest **product** role in Mobility Axiom. You **are** the person who may Finalize, Clean drafts, change server settings. |
| **IT administrator** (in the alert) | Generic **fallback phrase** in `errors.generic` — meant for desks where a normal operator must call someone else. |

**In your case: Super admin wins.**  
You should **not** be told to “contact your IT administrator” for a Clean drafts / Finalize failure on your own lab. That line is confusing and wrong for a signed-in Super admin.

The alert is **not** saying you lack Super admin. It is saying “we lost the real error and showed the generic bag.”

### 2) Why “can’t clear”?

Three different buttons — easy to mix:

| Button | What it actually does | Clears the 9 drafts? |
|--------|------------------------|----------------------|
| **Dismiss** | Hides the banner for this browser session only | **No** — drafts stay in Prior exports; banner often **comes back** on refresh / reopen |
| **Clean drafts** | Should delete all **Note pending / draft** redacts for this clip (API) | **Yes — if API succeeds** |
| **Finalize** | Opens note form for the **newest** pending only | No — finishes one draft |

Your screenshot still shows **“9 drafts waiting”** after the alert → **Clean drafts did not succeed** (or never ran). Dismiss alone will never empty that pile → feels like a **dead loop**: click → alert → OK → still 9 drafts → click again.

### 3) Why that exact useless message?

Text comes from:

`errors.generic` → *“Something went wrong. Try again or contact your IT administrator.”*

Typical paths to that bag on Clean drafts:

| Cause | What happens |
|-------|----------------|
| **A. Server not restarted** after cleanup MOB | `POST …/redact/cleanup-drafts` **404** → browser gets HTML → `res.json()` throws → catch → **generic** |
| **B. Real API error** stripped | Operator-error-voice maps unknown / “technical” text → **generic** |
| **C. Network / parse fail** | Same catch → **generic** |

So the product **hid the useful reason** and insulted you with “call IT” while you are already Super admin.

This is **not** the same dead loop as Finish Finalize ↔ empty note (that was fixed earlier). This is **Clean drafts fail + bad message + Dismiss ≠ clear**.

---

## What you can do **right now** (no APPLY)

1. Click **OK** on the alert (it is one browser dialog — not infinite by itself).  
2. **Restart** Fleet / `server.js` (cleanup API must be loaded).  
3. Hard refresh (**Ctrl+F5**).  
4. Open the same clip → **Clean drafts** → confirm.  
5. If alert returns: note whether it is still the same generic text — tell agent; do **not** keep hammering Dismiss expecting drafts to vanish.  
6. **Finalized** row with Download is safe — Clean drafts does **not** remove Finalized copies.

Until Clean succeeds, the honest declutter path is: Finalize one useful draft **or** wait for the fix MOB below.

---

## Root cause summary (for the next APPLY)

| Problem | Root |
|---------|------|
| Confusing “IT administrator” | `errors.generic` used as catch-all; no Super-admin-aware wording |
| Can’t clear 9 drafts | Clean drafts API failed or never reached; Dismiss is not delete |
| Feels like dead loop | Fail → generic alert → banner unchanged → repeat |
| No operator-useful text | Missing dedicated error string for cleanup / JSON fail / 404 |

---

## Recommended MOB (one APPLY)

**Name:** `REDACT-CLEAN-DRAFTS-HONEST-ERROR-V1`

### Must fix

1. **Honest errors** on Clean drafts / Remove draft:  
   - If API missing / not restarted → plain: “Restart the server, then try Clean drafts again.”  
   - If permission → “Super admin required.” (you already are — rare)  
   - If success → drafts gone; banner cleared; no generic bag.  
2. **Never** show “contact your IT administrator” for Super-admin evidence cleanup failures — use **Super admin / restart / try again** language.  
3. **Dismiss** label or hint: “Hide for now (does not delete drafts)” so it is not mistaken for Clear.  
4. Safe JSON parse on cleanup response (don’t throw straight to generic).  
5. Optional: inline error under the banner (not only `alert()`).  
6. Cache bust.

### Out of scope

- Face blur quality  
- Deleting **Finalized** exports  
- Rewriting all `errors.generic` app-wide (can note for later genre)

### Verify PASS

| # | Test | Pass |
|---|------|------|
| 1 | After restart, Clean drafts on 9 pending → list shrinks; banner gone or count drops | ☐ |
| 2 | Fail case shows a **specific** sentence (not IT-admin generic) | ☐ |
| 3 | Super admin never told to “contact IT” for this action | ☐ |
| 4 | Dismiss copy makes clear it does not delete | ☐ |
| 5 | Finalized Download row still present | ☐ |

---

## Related

- Cleanup feature: `MOB-APPLIED-REDACT-PRIOR-EXPORTS-CLEANUP-V1-20260722.md`  
- Earlier Finalize UI loop: `MOB-APPLIED-REDACT-FINALIZE-LOOP-BREAK-UI-V1-20260722.md`  
- This disc: message + clear semantics — not face knobs  

---

## Ask

When ready:

**`MOB-APPLY REDACT-CLEAN-DRAFTS-HONEST-ERROR-V1`**

Meanwhile: **restart server once**, then retry **Clean drafts** (not Dismiss).
