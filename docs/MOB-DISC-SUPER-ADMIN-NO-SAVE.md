# MOB DISC — Why super admin row has no Save (Operators tab)

**Status:** DISC — explains current behaviour + UX gaps. Not a server bug for most cases.  
**Trigger:** User signed in as super admin, on Dashboard → Operators, cannot Save.

---

## Short answer

**The super admin row (`global` or any `super_admin` account) does not get a Save button.** That is **by design today**.

| Row type | Save button | What you can change on the row |
|----------|-------------|--------------------------------|
| **Super admin** | **No** | **Set password** only (Actions column) |
| **Operator** | Yes (after you change something) | Permissions, dates, dispatch groups, then Save |

Super admin **already has full access** — map, fleet, SOS ledger, all dispatch groups, evidence, VC, audit. The grid shows **All** in permission columns instead of checkboxes. There is nothing to “save” except password (separate dialog).

**To test “See all dispatch groups” / group assignment:** use an **Operator** row, not the super admin row.

---

## Where this is coded

`public/js/server-setup.js` → `loadUsers()`:

- `isSuper === true` → Actions cell = **Set password** only (no `.ss-user-save`).
- `isSuper === false` → Save + Set password + Remove.

Server `lib/dashboardAuth.js` → `updateUser()`:

- If role is `super_admin`, a permissions patch **forces almost everything to true** and ignores group assignment (`assignedGroupIds` deleted).
- Only **device kill switch** can differ on super admin when a patch is sent.

So even if Save existed, toggling map/evidence/see-all on the super admin row would **not stick** — backend normalises to full access.

---

## Why it feels broken (UX, not logic)

### 1. You were probably on the wrong row

Most installs have one visible super admin (`global`). A3 badges and “Corporate” copy sit on that row. User expects to toggle scope there — **scope is not configurable for super admin**; it is always “all stations / all groups.”

### 2. No explanation on the row

Super admin row shows badges and **All** pills but **no line** saying: *“Full access — permissions are not edited here. Use Set password to change password. Create an Operator to assign dispatch groups.”*

### 3. Kill switch checkbox with no Save (real inconsistency)

Super admin row is **mostly** non-editable, but **Device kill switch** is still a **checkbox** (not “All”). Changing it calls `markUserRowDirty()` — row highlights — **but there is no Save button** to persist it.

So: only editable field on super admin row, and **no way to save it from the UI**. Backend would accept a PATCH for kill switch if Save existed.

### 4. Operator Save is easy to miss

On operator rows, Save starts **disabled** until a checkbox/date changes. Column is far right on a ~2240px table — same scroll problem as A3.

### 5. “My account” sub-tab

Dashboard → **My account** (not Operators) is read-only summary of your session — **no Save** there either. Permissions for others are only on **Operators**.

---

## What you should do today (no code change)

| Goal | Where |
|------|--------|
| Change super admin password | Operators → super admin row → **Set password** |
| Assign dispatch groups / see all | **Operator** row → change checkboxes → **Save** |
| Add operator | Bottom “Add user” on Operators tab |
| See your own role | Dashboard → **My account** (view only) |

---

## Optional fix MOBs (separate from copy-neutral A3)

| MOB | Change | Risk |
|-----|--------|------|
| `mob-users-super-admin-row-hint` | One line under super admin role: full access, no Save; password via Set password | 1 |
| `mob-users-super-killswitch-save-or-lock` | Either add **Save** for kill-switch-only on super row, **or** show kill switch as **All** like other perms (no false edit) | 1–2 |
| `mob-vms-deploy-a3-copy-neutral-ux` | Already queued — move dispatch column, drop Corporate jargon | 1–2 |

**Recommendation:** lock kill switch as **All** on super admin row (match other columns) **unless** product wants super admin to opt out of kill switch — then add Save for that row only.

---

## Apply

- Copy/jargon/ column: `MOB-APPLY mob-vms-deploy-a3-copy-neutral-ux`
- Super admin row clarity: `MOB-APPLY mob-users-super-admin-row-hint` (+ kill switch fix if wanted)

No live/SOS checkpoint for Settings-only MOBs.
