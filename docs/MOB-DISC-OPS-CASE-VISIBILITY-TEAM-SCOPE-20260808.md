# MOB DISC — Cases visibility: team vs supervisor (2026-08-08)

**Status:** disc — lock who sees which cases. No code this turn.  
**Ask:** User only sees their own team; supervisors get allowed wider views — right?

---

## Short answer

**Yes — that is the right enterprise model.**  
Not everyone sees every case worldwide.

| Role | What they see in Evidence → Cases |
|------|-----------------------------------|
| **Operator** | Cases tied to **their scope** (assigned stations / cams / team) — not the whole fleet |
| **Supervisor** (same as operator role today, or future supervisor flag) | **Same as operator** unless you grant wider station scope — “supervisor” in ME8 today is usually **more stations assigned**, not a magic all-seeing role |
| **Super admin** | **All** cases (see-all), plus Edit/Delete notes |

So: **team/scope filter = yes.**  
**Super admin = see all + edit/delete.**  
Supervisors see more only if their **dispatch scope** already allows more cameras/stations — same rule as Ops/Fleet today.

---

## How ME8 already thinks (reuse, don’t invent)

Lab already has **dispatch scope**:

- Super admin → `seeAll`  
- Operator → only **assigned** stations/devices  

**Cases must use the same gate:**

- Case has `camId` / station / device  
- List API returns only cases the session may see  
- Operator cannot open `WD-…` for a cam outside their team by guessing the case ID (server 403)

SOS cases: link ledger rows they are already allowed to see.  
FR / ANPR / Weapon: same cam/station scope.

---

## Concrete rules (lock)

1. **Evidence → Cases** — every operator/supervisor may **enter** the desk (not Super-admin-only).  
2. **List contents** — filtered by **dispatch scope** (team/stations).  
3. **Add note** — only on cases they can see.  
4. **Edit/Delete note** — Super admin only (and they see all).  
5. **Toast / live alarm** — still only for cams they watch / are allowed (unchanged).

Optional later (if you want a true “Supervisor” role separate from Super admin):

- Role `supervisor` = see **all stations in org** (or multi-team) but **still cannot** Edit/Delete notes unless Super admin.  
Today ME8 is mostly **operator vs super_admin** — wider view = assign more stations or promote to super_admin. Don’t invent a third role until you ask for it.

---

## What you do

Confirm: **Cases list = same dispatch scope as Fleet/Ops** — PASS?  
(If you want supervisors = see-all but not Super admin, say so — that needs a named role MOB.)
