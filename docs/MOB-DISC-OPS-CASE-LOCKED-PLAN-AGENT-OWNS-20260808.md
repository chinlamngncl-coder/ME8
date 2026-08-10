# MOB DISC — Locked plan: Ops Cases (agent decision) (2026-08-08)

**Status:** LOCKED recommendation. Not a menu. Not “your call.”  
**Agent owns the how.** You PASS/FAIL after build. Paper only until you `MOB-APPLY` the first named step.

---

## What we are building (one sentence)

One **Evidence → Cases** filing cabinet for **SOS + Analytics (FR / ANPR / Weapon)**, scoped by **dispatch team**, Super admin only for **edit/delete notes**, live **toasts = alarm only** — not the office.

---

## Locked decisions (no forks)

| Topic | Decision |
|-------|----------|
| Where users work | **Evidence → Cases** (one left-nav item). Not four top tabs. Not toast-as-office. |
| Toast / HQ blink | **Alarm only** (Ack / Open live / Show map). **No** History/Case workplace on toast. Optional later deep-link “Open case” only after Cases desk exists — default **off** until Cases PASS. |
| Folder tree | `storage/ops-cases/{YYYY-MM-DD}/SOS|ANALYTICS/{FR\|ANPR\|WEAPON}/{caseId}.json` |
| Case ID | System-only (`SO-` / `FR-` / `AN-` / `WD-` + date + unique). Never operator-typed. |
| Rev | System **Rev N** inside JSON on each material change. Not filename games. |
| Who enters Cases | Any operator/supervisor with Evidence access. **Not** Super-admin-gated. |
| Who sees which rows | Same **dispatch scope** as Fleet/Ops (team/stations). Super admin = see all. |
| Who edits/deletes past notes | **Super admin only.** Everyone else **add note** only. |
| FTP / hand-edit disk | **Forbidden.** Only app API writes cases (after server store). |
| SOS | **Link** existing SOS ledger id into `SO-…` case — do not fork SOS truth. |
| FR / ANPR / Weapon | Same case schema; `kind` + `refs` differ. |

---

## Why this (enterprise, short)

Alarms interrupt on live surfaces. Records live in a **records module** (Evidence).  
Taxonomy (SOS vs Analytics → type) + unique IDs + day folders = searchable without name collisions.  
Scope = same trust boundary you already use for cameras.  
Super admin = integrity of the file, not the only person allowed to walk into the room.

---

## Build order (I will drive; you APPLY one name at a time)

| # | APPLY name | Outcome |
|---|------------|---------|
| **1** | `OPS-CASE-SERVER-STORE-V1` | Tree + API create/list/get/add-note/edit-delete with auth + scope + role |
| **2** | `OPS-CASE-UI-DESK-V1` | Evidence → Cases desk (filters + list + case detail) |
| **3** | `OPS-CASE-WEAPON-MIGRATE-V1` | Weapon Ack/notes write to server Cases; remove toast History-as-office |
| **4** | `OPS-CASE-FR-WIRE-V1` | FR alerts create/open FR cases |
| **5** | `OPS-CASE-ANPR-WIRE-V1` | ANPR critical → ANPR cases |
| **6** | `OPS-CASE-SOS-WIRE-V1` | SOS ledger → linked SOS cases |

Lab Weapon session History stays until **3** — then it dies or becomes a thin jump into Cases.

---

## What you do now

Type exactly:

`MOB-APPLY OPS-CASE-SERVER-STORE-V1`

I build step 1. You restart / refresh / PASS-FAIL what you see.  
No A/B. No toast office. No “decide for me.”
