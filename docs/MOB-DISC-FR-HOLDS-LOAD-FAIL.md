# MOB DISC — Investigation holds: “Could not load”

**Status:** DISC only — **no APPLY**  
**Date:** 2026-07-13  
**Trigger:** Evidence → **Investigation holds** → Refresh → **“Could not load investigation holds.”**  
**Search:** holdsLoadFail, `/api/analytics/fr/kept`, FrKeptUi, Investigation holds  
**Related:** `mob-fr-kept-evidence-ui` (APPLIED) · `MOB-DISC-FR-MAP-KEEP-NOTHING-EXPAND-RED.md`

---

## What the screen means

| Message | Meaning |
|---------|---------|
| **Could not load investigation holds.** | API call failed or returned non-OK — **not** “folder empty” |
| No investigation holds yet… | API OK, zero packs (healthy empty) |
| Face recognition is not licensed… | HTTP **403** FR license off |

So this is a **load failure**, not “Keep never saved anything.”

Panel copy (“Browse here — no need to open the server folder”) is fine; the **list request** is what broke.

---

## Lab facts (this tree)

| Check | Result |
|-------|--------|
| UI panel / `fr-kept-ui.js` | Present (APPLIED) |
| `GET /api/analytics/fr/kept` in `server.js` | Present in source |
| Disk `storage/fr-kept/` | Exists; **README only** — no `index.jsonl`, no `.jpg` packs yet |
| Empty disk + working API | Would show **empty** hint, **not** “Could not load” |

Conclusion: browser never got a successful `{ ok: true, holds: [...] }` JSON payload.

---

## Why the UI says that (code path)

```
GET /api/analytics/fr/kept?limit=100
  → 403     → “not licensed”
  → !ok or !data.ok  → “Could not load…”   ← your screenshot
  → network / non-JSON → same vague line
```

**Status / body are swallowed** — operator cannot tell 404 vs 401 vs 500 vs HTML login page.

---

## Likely causes (ranked)

| Rank | Cause | Why it fits |
|------|--------|-------------|
| **1** | **Fleet not restarted** after `mob-fr-kept-evidence-ui` | New **GET** route only exists in process memory after restart; hard refresh alone → **404** → vague fail |
| **2** | Auth / session | 401 or HTML gate → `data.ok` missing → same toast |
| **3** | Wrong host / proxy | Console not hitting the ME8 process that has the new routes |
| **4** | Server 500 | `list()` throw (unlikely on empty dir) |
| **5** | FR license | Would show **licensed** message (403), not this line — lower odds |

**Most probable lab fix before any MOB:** `RESTART-FLEET.bat` → hard refresh → open Investigation holds again.

Expect after restart with empty folder: **“No investigation holds yet…”** (success empty).  
After a real Keep with crop: cards appear.

---

## Relation to map “Nothing to keep”

| Issue | Layer |
|-------|--------|
| Map Keep → Nothing to keep | No / bad **cropUrl** on pin (upstream) |
| Evidence → Could not load | **List API** not reachable / not OK |

Different bugs. Empty `fr-kept` is consistent with Keep never succeeding — but the Evidence message still means **API fail**, not empty.

---

## Product gaps

| Gap | Fix direction |
|-----|----------------|
| Vague “Could not load” | Show status + short reason (404 → “Restart Fleet / new route missing”; 401 → “Sign in again”) |
| No DevTools hint in UI | Optional `code` from API in panel meta |
| Operator thinks folder is broken | Clarify empty vs load-fail (already two strings — need API up to see empty) |

---

## Proposed MOBs (parked)

### A — `mob-fr-holds-load-error-detail` (small, recommended)
- Panel shows `HTTP {status}` + short operator line  
- Map 404 → “Server needs restart (Investigation holds API missing)”  
- Keep empty folder messaging unchanged  

### B — ops check (no MOB)
- Restart Fleet + hard refresh first  
- Network tab: `GET …/api/analytics/fr/kept` must be **200** + `ok:true`  
- Then Keep a snap that **has a crop** → Refresh holds  

### C — only if A still fails after restart
- Trace auth middleware / FR license / route order — separate named MOB after evidence  

**Suggested order:** **B (restart)** → if still fail, **A** → then deeper.

---

## PASS after restart (no code)

1. Restart Fleet  
2. Hard refresh  
3. Evidence → Investigation holds → **empty** message (not “Could not load”)  
4. Keep with real crop → Refresh → thumb card  

---

## No code in this DISC
