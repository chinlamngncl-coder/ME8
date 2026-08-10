# MOB DISC — Delete Case / Clear all? (checked vs Axon) (2026-08-09)

**Status:** LOCKED design. **No code.**  
**`.cursorrules`:** UI + CREDIT-LEAN — this is product policy only.  
**Today ME8:** no Delete case / Clear all on Cases list (notes delete = Super admin only).

---

## Your question

1. Can I delete a case?  
2. Can I clear **all** cases on the system?  
3. Is that a good idea?  
4. How do others do it?

---

## How others do it (checked)

| Source | What they do |
|--------|----------------|
| [Axon Evidence — Cases](https://www.axon.com/help/axon-evidence/software/axon-evidence/cases/cases.htm) | **Delete case** exists — needs **Delete case** permission. Selected cases → More actions → Delete. Warns: evidence leaves the case and may follow retention (even queue for deletion). Deleted cases can still be **viewed** in some states. Prefer **retention / status / archive** over casual wipe. |
| Axon evidence files | Delete → **7-day deletion queue** (undo window), not instant forever-gone. |
| Common DEMS | **Close / Archive / retention policy** first. Hard purge is rare, permissioned, audited. **“Clear all cases” as one big red button for every operator = not normal** (destroys chain of custody story). |

**Bottom line from industry:** tidy the **list** with Archive/Close; hard delete is **admin + confirm + audit**; mass wipe is **dangerous** and usually not offered as everyday UI.

---

## Is it good to have?

| Function | Good? | Why |
|----------|-------|-----|
| **Hide / Archive** from default list (keep on disk) | **Yes — first** | Fixes “list getting higher” without killing history. Already named: `OPS-CASE-ARCHIVE-HIDE-V1` |
| **Close / settle** case | **Yes** | Real EMS end state |
| **Delete one case** (Super admin only) | **Yes, careful** | Lab mistakes, test junk, wrong raise. Confirm dialog + write audit “case.deleted”. Prefer soft-delete (status Deleted, still viewable) like Axon pattern |
| **Clear all cases** (one click wipe system) | **No for normal product** | Too easy to destroy desk history + blame gaps. If ever: **Super admin + type CONFIRM + optional lab-only flag** — never for ordinary operators |

**Video / FTP / Redacted Exports:** deleting a Case must **not** auto-delete Library media or redacted exports unless a separate, explicit retention APPLY says so (Axon: case delete unlinks evidence; retention may then apply to files separately).

---

## ME8 recommendation (locked)

```text
Everyday ops:     Archive / hide  (list clean, disk stays)
Supervisor:       Close / settle
Super admin:      Delete ONE case (confirm + audit) — later APPLY
Never default:    “Clear all cases” button on the desk
Lab only (optional later): Super admin tools → Purge cases older than X / wipe lab folder — gated, not Cases toolbar
```

**Today:** you cannot delete/clear all from UI — correct until we APPLY archive + optional single delete.

---

## APPLY names (when you want code)

1. `OPS-CASE-ARCHIVE-HIDE-V1` — **do this first** (good function)  
2. `OPS-CASE-DELETE-ONE-V1` — Super admin, one case, confirm + audit (soft delete preferred)  
3. `OPS-CASE-LAB-PURGE-V1` — optional; **not** “Clear all” on Cases list — separate Super admin / lab tool  

---

## One line

**Yes tidy cases — Archive first. Single Super-admin delete with audit is OK later. “Clear all” is a bad everyday feature; others use retention/archive/permissioned delete, not a wipe button.**
