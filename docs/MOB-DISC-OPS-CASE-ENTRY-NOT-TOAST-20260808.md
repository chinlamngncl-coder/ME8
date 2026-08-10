# MOB DISC — Cases entry: NOT toast; supervisors go in without Super admin (2026-08-08)

**Status:** disc only.  
**You:** “Toast?? no way” — users/supervisors must **go in** to Cases. Must **not** require Super admin to enter.

---

## Locked (plain)

| Thing | Role |
|-------|------|
| **Toast / HQ blink** | **Alarm only** — wake up, Ack, Open live, Show map. **Not** the case office. |
| **Evidence → Cases** | **Where people go in** to work records — list, open case, add notes, review Rev / touch log. |
| **Who may enter Cases** | **Operators + supervisors + Super admin** — **no** Super admin required to open the desk. |
| **Super admin only** | **Edit / Delete past notes** (and later wipe/override). Everyone else: view + **add** note. |

Toast is **not** the filing cabinet. You were right to reject that.

---

## How a supervisor works (concrete)

1. Login as **operator / supervisor** (normal role — not Super admin).  
2. Top nav → **Evidence** → **Cases**.  
3. Filter SOS / Analytics → FR / ANPR / Weapon.  
4. Open a case → read notes → **Save add-on** if needed.  
5. They **never** need Super admin just to walk in.

Optional later: toast button **“Open case”** = **shortcut** into Evidence → Cases for that caseId.  
Still not “do all case work on the toast.” If you hate even the shortcut, we leave toast with **zero** History/Case buttons and Cases is **only** via Evidence.

**Recommendation:** Evidence → Cases = primary. Toast shortcut = optional, off by default if you say so.

---

## What Super admin is for (narrow)

```text
Enter Cases          → everyone with Evidence access
Add note             → everyone
Edit / Delete note   → Super admin only
```

Supervisors ≠ Super admin unless you promote them to that role.

---

## What we change in product thinking

| Old soft talk | Locked now |
|---------------|------------|
| Floating Weapon “History” as main workplace | Temporary lab only; **replace** with Evidence → Cases |
| Toast History as main path | **No** — alarm only |
| Super admin to “go in” | **No** — only for edit/delete |

When we APPLY `OPS-CASE-UI-DESK-V1`: build Evidence → Cases; Weapon toast History can be removed or reduced to “Open in Cases” only if you allow.

---

## What you do

Confirm:

1. **Evidence → Cases** = only/main door — PASS?  
2. Toast: **A)** no case links at all, or **B)** optional “Open case” shortcut only?

Then later: `MOB-APPLY OPS-CASE-SERVER-STORE-V1` → `OPS-CASE-UI-DESK-V1`.
