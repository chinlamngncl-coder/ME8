# MOB DISC — Do customers need `storage\license.lic` in the Installation Guide?

**Date:** 2026-07-28  
**Status:** **PASS 2026-07-28** — `MANUALS-V1-INSTALL-DROP-LICENSE-PATH-V1` in live `Installation Guide.rtf` (v1.1)  
**Operator:** PASS  
**Search:** license.lic path, storage folder, Installation Guide customer voice  
**File:** `Mobility Axiom Manuals V1/Installation/EN/Installation Guide.rtf`  
**Related:** `MOB-DISC-MANUALS-V1-INSTALL-ADMIN-AND-LICENSE-WORDING.md`

---

## Question

After Install license succeeds, the guide currently says the file is stored as `storage\license.lic` (Linux: `storage/license.lic`).

Do we have to tell clients that location? If yes, what for? If not, drop it.

---

## Decision (one path)

**No — not for the normal new-client Installation Guide.**

Clients do **not** need the on-disk path for day-to-day install.

**What they need:**

1. Receive **`license.lic`** from Ubitron (after Hardware ID).  
2. On the **Setup page**, choose **Install license** and select that file.  
3. See success (e.g. license valid for this Hardware ID) → continue.

The product already saves the file for them. The path is an **internal storage detail**, not an install step.

---

## What the path is actually for

| Audience / case | Need `storage/license.lic`? | Why |
|-----------------|-----------------------------|-----|
| New client via Setup UI | **No** | Upload does the save |
| Daily dashboard operators | **No** | License already installed; they never open that folder |
| Backup / disaster recovery | Optional (Tech / IT) | Know what to back up with the install folder |
| Support / Ubitron troubleshooting | Yes (Tech) | Confirm file present, replace, diagnose |
| Pre-placed license before first start (rare delivery) | Short note only | README / ship pack may say “put file in storage” — not the main Setup story |

So: **path = Tech / support / optional IT**, not customer Installation Guide success text.

---

## Recommended guide wording

**Keep (customer):**

> On the Setup page, choose **Install license** and select the `license.lic` file you received from Ubitron.  
> When the page shows the license is valid for this Hardware ID, you are done with licensing.

**Remove from Installation Guide success paragraph:**

> The file is stored on the server under the install folder as `storage\license.lic` …

**Optional one-line alternate (only if we keep pre-place):**

> If Ubitron already placed the license on the server before delivery, skip Install license and continue — your README will say if that applies.

Do **not** teach the folder path in that optional line unless the ship README already uses it; then Tech Reference owns the exact path.

**Where the path belongs instead:** Technical Manual / IT Admin seed (`docs/IT-ADMIN-MANUAL.md` style) — backup, replace license, support.

---

## APPLY name (when ready)

`MANUALS-V1-INSTALL-DROP-LICENSE-PATH-V1`

**Scope:** Installation Guide only — delete/reword the `storage\license.lic` success sentence; tighten optional pre-place line if present; no product code.

---

## Lock

| Item | Decision |
|------|----------|
| Must customers know disk path? | **No** (normal install) |
| Why path exists | Product save location; backup/support/Tech |
| Installation Guide | UI install + success only |
| Exact path text | Tech manuals / support only |
