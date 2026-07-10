# MOB DISC — SOS ledger scope re-test (step-by-step)

**Status:** **PASS** (user confirmed 2026-07-10 and prior). Do **not** daily-nag. Re-open only if scope code changes or user asks.  
**MOB under test:** `mob-me8-sos-ledger-dispatch-scope` (applied 2026-07-06).  
**Why it matters:** Tender / enterprise claim — station operator must not see other stations’ SOS ledger rows, CSV, or incident folders.  
**Risk of re-test:** **1** (read/filter only). Does not change live SIP SOS ingest.  
**Pass signal:** Reply **`SOS LEDGER SCOPE PASS`** — **received**.

---

## What “scoped” means (product rule)

| Actor | Ledger list | CSV export | Open incident folder |
|-------|-------------|------------|----------------------|
| **Super admin** | All cams | All rows | Allowed |
| **Operator + See all groups** | All cams | All rows | Allowed |
| **Operator + assigned group(s) only** | Only SOS from BWCs in those groups | Same filter | **403** if incident camera is out of scope |
| **Operator with `assignedGroupIds` never set** | Legacy **see-all** (same as unscoped) | Same | Allowed |

Enforcement: `sessionCanSeeCam` → `dispatchScope.sessionCanAccessDevice` on `/api/sos-incidents`, `/export`, `/open`.

Visibility uses **group membership of the BWC** (`dispatch group members`), not “who acknowleged.”

---

## Lab prep (once)

Use **two cams in two different dispatch groups**. Example labels (rename to your fleet):

| Label | Meaning |
|-------|---------|
| **Group Alpha** | Station A — includes **Cam-A** |
| **Group Bravo** | Station B — includes **Cam-B** |
| **User `global` (or site super admin)** | Corporate / NHQ — see all |
| **User `station-a`** | Operator; **See all groups = OFF**; assign **only Group Alpha** |

### Checklist before day of test

1. Server Config → **Map groups**: Alpha has Cam-A; Bravo has Cam-B (no shared membership for the negative case).  
2. Server Config → **Users**: create/edit `station-a`:
   - Role: operator  
   - Uncheck **See all groups**  
   - Check **only Alpha** under Assign to groups  
   - **Save that row**  
3. Sign out / sign in as `station-a` once so session picks up permissions.  
4. Prefer **existing historical SOS rows** for both Cam-A and Cam-B in the ledger window (default ~days). If empty, raise **one SOS per cam** as Super admin (ack or leave open — either is fine for list scope).  
5. Two browsers or one normal + one private window (super admin vs `station-a`).

Optional (folder 403 proof without guessing IDs):

- As super admin, open DevTools → Network on SOS ledger click, note an **out-of-scope** `incidentId` (Cam-B) for later POST.

---

## Re-test steps

### A — Super admin = full ledger (baseline)

1. Sign in as **super admin**.  
2. Open Operations (or wherever SOS ledger panel lives) → unlock ledger PIN if your site asks.  
3. **Reload list**.  
4. **Expect:** rows for **both** Cam-A and Cam-B (and any other in-window incidents).  
5. **Export CSV** (same UI control / `/api/sos-incidents/export`).  
6. **Expect:** CSV contains both Cam-A and Cam-B identifiers.  
7. Optional: click a Cam-B row → folder opens on server PC (Windows explorer) — **Expect:** success, not 403.

### B — Station operator = Alpha only (core claim)

1. Sign **out**; sign in as **`station-a`**.  
2. Open SOS ledger → Reload list.  
3. **Expect:** Cam-A rows **visible**; Cam-B rows **absent** (not greyed — gone from API).  
4. Export CSV as `station-a`.  
5. **Expect:** Cam-A present; **no** Cam-B (and no other Bravo-only cams).  
6. Spot-check: map / fleet for this user should also hide Cam-B (same scope rule — nice-to-have, not the ship gate).

### C — Out-of-scope folder open → 403 (enforcement)

Do **one** of:

**UI path (preferred if you can deep-link):**  
If the UI only lists in-scope rows, use Network/API path below (station user has no Cam-B row to click).

**API path (definitive):**

1. Stay signed in as `station-a`.  
2. DevTools → Console or Network, POST (cookie session):

```http
POST /api/sos-incidents/open
Content-Type: application/json

{ "incidentId": "<incident id belonging to Cam-B>" }
```

3. **Expect:** **HTTP 403** (and no explorer open for that folder).  
4. Repeat with a **Cam-A** `incidentId`.  
5. **Expect:** **200 / ok** (folder opens on Windows server).

If you have no Cam-B incident id: as super admin copy one from ledger API response JSON (`/api/sos-incidents`), then switch to `station-a` for the POST.

### D — Negative controls (quick)

| Check | Expect |
|-------|--------|
| Toggle **See all groups ON** for `station-a`, save, re-login | Ledger/CSV show Cam-B again |
| Turn See all OFF again, save, re-login | Cam-B disappears again |
| Super admin never loses both cams | Full list still OK |

---

## Pass / Fail rubric

| Result | Reply |
|--------|--------|
| A + B + C all match | **`SOS LEDGER SCOPE PASS`** |
| Any of: Cam-B visible to station-a; CSV leak; open folder **not** 403 for Cam-B | **`SOS LEDGER SCOPE FAIL`** — note step A/B/C + screenshot / status code |

Do **not** treat empty ledger as PASS — you need at least one in-scope and one out-of-scope incident in the window.

---

## Out of scope for this re-test

| Item | Notes |
|------|--------|
| Live SOS banner / auto-live / PTT on alarm | Different path; use live checkpoint separately |
| Clear list / retention governance | `MOB-DISC-SOS-LEDGER-GOVERNANCE.md` — later MOB |
| Hierarchy UI badges (Corporate / Station) | `mob-vms-deploy-a3-hierarchy-labels` — labels only |
| TOTP ship flag | Separate: `FM_TOTP_SUSPENDED=1` must be **OFF** before customer ship |

---

## After PASS

Update checkpoint in `MOB-DISC-ENTERPRISE-VMS-SIX-DOMAINS.md` (operator or next MOB turn):  
`mob-me8-sos-ledger-dispatch-scope` → **PASS** + date.

**PASS recorded 2026-07-09** — user confirmed (multiple times). No further ship-reminder nags for this item. TOTP (`FM_TOTP_SUSPENDED`) remind only when user says pack for shipping.
