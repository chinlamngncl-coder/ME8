# MOB DISC — Zero raw errors in UI (DOCTYPE / JSON leak)

**Status:** **APPLIED** 2026-07-09 — Site readiness + production access; `fetchOpJson`; `TECH_LEAK_RE` extended.

---

## What you saw

Site readiness panel showed a **browser developer error**, not a product message.

**Cause chain:**
1. New API `GET /api/site-readiness` exists on disk but **server was not restarted** → Express returns **HTML** (404 page or `index.html`).
2. `loadSiteReadiness()` calls `res.json()` on that HTML → throws syntax error.
3. Catch block prints **`err.message` raw** into the panel — **bypasses** `OperatorUI` / `OperatorErrorVoice`.

```javascript
// server-setup.js — wrong (A4)
el.innerHTML = '<p class="setup-hint">' + esc(err.message || String(err)) + '</p>';
```

---

## Locked rule (zero tolerance)

| Never show operators | Always show |
|----------------------|-------------|
| `Unexpected token`, `<!DOCTYPE`, `JSON`, stack traces | `errors.generic` or specific `errors.*` i18n |
| `err.message` directly | `opMsg()` / `OperatorUI.showOpError()` |
| Raw API bodies, status codes alone | Plain English + “contact IT” when needed |
| File paths, `storage/`, `node_modules` | Already filtered by `looksTechnical()` — **extend** for JSON/HTML leaks |

**Existing machinery (already in product):** `public/js/operator-ui.js`, `public/js/operator-error-voice.js`, `errors.generic` in locales.

**A4 broke the rule** by not using it.

---

## Other leaks in same file (fix in same MOB)

| Location | Bad pattern |
|----------|-------------|
| `loadSiteReadiness` | `err.message` in innerHTML |
| `loadProductionAccess` | `err.message` in status text |

Audit genre later: `err.message` in `command-centre.js`, `voice-alerts.js`, `lab-security.js` catch blocks.

---

## Fix MOB (one apply, risk 1)

**Name:** `mob-ui-zero-raw-api-errors`  
**Scope:** Settings / Server Config first; extend `TECH_LEAK_RE` globally.

1. **`loadSiteReadiness`** — use `opMsg(null, err, 'server.readiness.loadFailed')`; never `err.message`.
2. **`loadProductionAccess`** — same via `opMsg`.
3. **`operator-error-voice.js`** — add to `TECH_LEAK_RE`: `unexpected token`, `<!doctype`, `not valid json`, `syntaxerror`.
4. **Optional `fetchOpJson(res)`** helper in `operator-ui.js`: if `Content-Type` not JSON or parse fails → return `{ ok: false, errorKey: 'errors.generic' }` (log real error to console only).
5. **i18n:** `server.readiness.loadFailed` = “Could not load readiness checklist. Restart the server or contact your IT administrator.”
6. **Bench:** stop fleet → open readiness → must show **plain sentence**, not DOCTYPE/JSON text. Restart → checklist loads.

---

## Your immediate workaround

**`RESTART-FLEET.bat`** — new `/api/site-readiness` route only exists after Node restart. Until fix MOB, if you see anything ugly, restart first.

---

## Apply

`MOB-APPLY mob-ui-zero-raw-api-errors`
