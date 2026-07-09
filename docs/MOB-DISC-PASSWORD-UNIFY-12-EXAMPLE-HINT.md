# MOB DISC — Password policy unify + short example hint

**Status:** **APPLIED** 2026-07-08 — `mob-password-unify-12-both-roles` + `mob-password-label-match-policy`.  
**Why:** Users are blocked by confusing labels (min 8 vs 12/14) and long essay hints.  
**Related:** `MOB-DISC-PASSWORD-LABEL-MATCH-POLICY.md` (label bug) — merged into this APPLY.

---

## Locked policy (all dashboard roles)

| Rule | Value |
|------|--------|
| Min length | **12 for operator and super admin** (drop the 14 special case) |
| Uppercase | Required |
| Lowercase | Required |
| Digit | Required |
| Special | Required — keep allow-list `!@#$%^&*()-_+=` |
| Blocked | Default install password + common list + username + history (keep) |

**Not changing:** history count (5), cannot equal `global123`.

---

## Hint — how others do it / how we do it

Enterprise habit (Microsoft / Google / bank portals, NN/g):

- Label outside field: **Password** or **New password (min 12)**  
- **Persistent helper under the field** (not only a vanishing placeholder)  
- Short **shape example**, not a paragraph about “cannot reuse last 5…”

| Bad (today) | Good (locked) |
|-------------|----------------|
| Label `(min 8)` while API wants 12/14 | Label always **(min 12)** — matches API |
| Long: “At least N characters with uppercase…” | One line with shape example |
| Essay about history on every dialog | History stays **server error only** if violated |

Bare `(Ab12@)` is only 5 characters — use it as *shape*, but show a **12+ example** so users don’t think 5 chars is enough:

> `Min 12 · upper, lower, number, symbol · e.g. Ab12cd34!@#$`

---

## APPLY slices (one at a time)

| Slice | MOB | Risk | Ships |
|-------|-----|------|-------|
| **1** | `mob-password-unify-12-both-roles` | **2** | Super-admin min 14 → **12**; same assert for both roles |
| **2** | `mob-password-label-match-policy` | **1** | Kill hardcoded min 8; short example hint everywhere Set/Create/change uses policy |

Or one turn: reply **`MOB-APPLY mob-password-unify-12-both-roles` then `MOB-APPLY mob-password-label-match-policy`** (or **do both**).

---

## Bench

1. Set password dialog: min **12** + example shape; no “min 8”  
2. 11-char complex → reject; `Ab12cd34!@#$` → accept  
3. Super admin password change same min 12  
4. Create user form matches  
