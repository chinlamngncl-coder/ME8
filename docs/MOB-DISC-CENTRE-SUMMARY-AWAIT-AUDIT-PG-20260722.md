# MOB DISC — Centre Summary fails to load (root cause)

**Status:** DISC locked — **no APPLY** until you say the phrase  
**Date:** 2026-07-22 ~23:57  
**Trigger:** Operator — “why still fail to load summary? database? find the reason. Mob disc”

---

## Short answer

**Yes — the Postgres catalog move broke Centre Summary.**  
Not because the SOS/evidence tables are wrong. Because **audit listing became async** and Centre still treats it as a sync array.

---

## What you see

| UI (after V2) | Meaning |
|---------------|---------|
| **Failed to load summary.** | API returned fail (usually **500**), not the old remapped generic |
| **Super admin login required.** | 401/403 — wrong role / not signed in |

If you are on **global / super_admin** and still see load fail → this disc applies.

---

## Root cause (proven)

### 1. Audit is PostgreSQL + async now

`lib/auditLog.js`:

```js
function list(opts) {
    return siteDb.listAudit(opts);  // async → returns a Promise
}
```

`FM_CATALOG_MODE=postgres_required` — SQLite audit path is retired. Audit Trail API already does it right:

```js
// server.js /api/audit-log
entries: await auditLog.list({ limit, since }),
```

### 2. Centre still sync-grabs the Promise

`server.js` `commandCentreDeps()`:

```js
let auditEntries = [];
try {
    auditEntries = auditLog.list({ limit: 50 }) || [];  // ← Promise object, not rows
} catch (_) { /* ignore */ }  // ← does NOT catch async reject
```

A Promise is truthy, so `|| []` never runs.  
`getAuditEntries()` returns that **Promise**.

### 3. Report builder crashes

`lib/commandCentreReport.js` `buildSummary`:

```js
recentActivity: audit.slice(0, 25).map(...)
```

**Lab reproduce (no server):**

```
THROW TypeError: audit.slice is not a function
```

Route:

```js
app.get('/api/command-centre/summary', …, (req, res) => {
    try {
        res.json(commandCentreReport.buildSummary(commandCentreDeps()));
    } catch (err) {
        res.status(500).json(opErr(err));
    }
});
```

→ **HTTP 500** → UI: **Failed to load summary.**

Same bug hits **CSV/JSON export** (`/api/command-centre/export`) — same `commandCentreDeps()` sync path.

### 4. Not these (ruled out)

| Guess | Verdict |
|-------|---------|
| Broken SOS ledger / empty DB | No — fleet/SOS paths still sync; smoke `buildSummary` with empty audit **array** works |
| Storage walk too big | No — local walk ~60ms / ~1.8GB |
| UI-only / cache | V1/V2 only fixed messages; **server still 500** |
| Operator role | Would show **Super admin…**; super_admin still fails via this bug |

---

## Why it started after “database change”

When audit moved from sync file/SQLite-style list → **`siteDb.listAudit` Promise**, every caller had to `await`.  
Audit Trail page was updated. **Command Centre was not.**

---

## Fix scope (one MOB)

**Name:** `CENTRE-SUMMARY-AWAIT-AUDIT-PG-V1`

| In scope | Out of scope |
|----------|----------------|
| Make `commandCentreDeps` **async**; `await auditLog.list(...)`; on fail use `[]` | Opening Centre to non–super-admin |
| `GET /api/command-centre/summary` + `export` → `async` handlers | Reworking audit schema / migration |
| Optional belt: in `buildSummary`, if `!Array.isArray(audit)` → `[]` | UI copy (already honest in V2) |

**Risk:** Low — same pattern as `/api/audit-log`.

**PASS:** Super admin → Centre Summary shows KPIs / Updated … (not Failed to load). Export CSV opens.

---

## Recommended APPLY

**`MOB-APPLY CENTRE-SUMMARY-AWAIT-AUDIT-PG-V1`**

Until then: disc only — no code.
