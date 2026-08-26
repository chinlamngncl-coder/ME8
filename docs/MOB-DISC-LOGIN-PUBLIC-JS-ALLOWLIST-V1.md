# MOB DISC — Login public JS allowlist (HTTP) — still needed?

**Status:** PAPER ONLY — no APPLY this turn.  
**Context:** HTTPS LAN audio PASS (`WSS-HTTPS-UPGRADE-LAN-V1`). Operator asked if `LOGIN-PUBLIC-JS-ALLOWLIST-V1` still matters.  
**Rules:** credit-lean · zero-change without APPLY.

---

## 1) What is it?

Unauthenticated `login.html` loads several `/js/*.js` files. Auth middleware only allows a **short public list**. Missing names get **401** → browser gets HTML instead of JS → console MIME errors (your HTTP `:3988` login pic).

**On allowlist today:** `login.js`, `i18n.js` (plus APIs).  
**Loaded but not public:** e.g. `ax-select-wrap.js`, `operator-error-voice.js`, `operator-ui.js`, `password-policy-ui.js`, `auth-form-busy.js`.

Core sign-in can still work if `login.js` alone is enough; extras (busy state, password hints UI, select wrap, error voice) are broken/noisy on a **fresh** session.

Same allowlist applies to **HTTP and HTTPS** — not an HTTP-only bug. You noticed it harder on `:3988` because that was the “Not secure” + fresh-cookie path you opened.

---

## 2) Important now that HTTPS works?

| Question | Answer |
|----------|--------|
| Blocks mic / live / ship audio? | **No** |
| Blocks “open HTTPS and talk”? | **No** |
| Blocks login entirely? | Usually **no** if `login.js` loads |
| Hurts first install / HTTP fallback / ugly console? | **Yes** (polish + less support noise) |

**Verdict:** **Not important for the audio genre.** Optional hygiene. Do **not** block ship on it if HTTPS portal is the documented client URL.

---

## 3) Still need to do it?

**Recommendation:** **Park / low queue.** Prefer ship path = HTTPS + cert at install (already the audio story).

Do the allowlist MOB when you want clean login on HTTP **or** fewer “red console on login” tickets — ~one small list edit, low risk.

**Skip for now** if the next priority is Evidence / other product work.

---

## 4) If APPLY later

**Name:** `LOGIN-PUBLIC-JS-ALLOWLIST-V1`  
**Change:** add the login.html script paths to `PUBLIC_PATHS` in `lib/dashboardAuth.js` (and any twin list for must-change / enroll pages if they share the same scripts).  
**Verify:** hard refresh `http://<LAN>:3988/login.html` and `https://…:4438/login.html` — no 401 on those `/js/` files; sign-in still works.

No creativity beyond the files `login.html` already references.
