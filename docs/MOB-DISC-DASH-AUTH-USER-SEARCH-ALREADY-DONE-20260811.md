# MOB DISC — Dashboard auth user search (already shipped) — 2026-08-11

**Status:** Fact check. **No code this turn.**  
**Read:** `.cursorrules`

---

## Already done

**APPLY:** `USERS-AUTHORITY-FILTER-V1` (2026-08-10)  
**Disc:** `MOB-DISC-USERS-AUTHORITY-FILTER-APPLY-20260810.md`

| Where | What |
|-------|------|
| Settings → **Dashboard Authentication** → **Users & authority** | Filter bar above user cards |
| **Search** | Username, display name, contact, user id, group name |
| **Role** | All / Super admin / Operator |
| **Stations** | All / All stations / Assigned only |

Does **not** rebuild cards (safe while editing). Empty state if no match.

---

## If you still need something else

Say which gap (examples only if true for you):

| Gap | Possible next APPLY |
|-----|---------------------|
| Filter not visible / broken after refresh | Diagnose — may be cache; not a new feature MOB |
| Search on **Add New Admin / Operator** too | `USERS-ADD-TAB-LOOKUP-V1` (only if you ask) |
| Sort / pagination for 50+ users | `USERS-AUTHORITY-LIST-PAGE-V1` later |
| Search by permission checkbox | Out of scope unless you name it |

**Recommendation:** Hard refresh once and confirm the filter bar on Users & authority. If PASS, no new MOB for this. If FAIL or you want a named gap, say the exact gap → one APPLY.

No APPLY this turn.
