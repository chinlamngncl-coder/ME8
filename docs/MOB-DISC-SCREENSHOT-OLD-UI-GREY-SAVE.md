# MOB DISC — Screenshot vs ME8 + grey Save + ship super admin

**Status:** DISC  
**Screenshot:** 2026-07-09 — still shows **old A3** (NHQ, Corporate, Station scope far right). **ME8 disk already has neutral MOB** (`20260709-a3-neutral`). Browser is serving **old files** or fleet was **not restarted from ME8**.

---

## 1. Your screenshot ≠ what we shipped on disk

| On screen (your pic) | ME8 after MOB |
|----------------------|---------------|
| NHQ / Corporate intro | **All stations** / **Assigned only** |
| Station scope (far right) | **Dispatch groups** (after Role) |
| See all stations (Corporate) | **See all dispatch groups** |

**Fix to see new UI:** stop fleet → run **`ME8\RESTART-FLEET.bat`** → **Ctrl+F5** on Settings page.  
If you start fleet from another folder (SaaS Mobility, Lab-8BWC-v2, Ent8), you get the old UI until that tree is updated.

---

## 2. `global` super admin — nothing to change here

You are owner on **lab `global`**. Correct:

- Super admin row = **full access**, not edited on this grid.
- **No Save** on that row — only **Set password**.
- You do **not** need to touch dispatch groups for `global`.

**Customer ship (locked):** first boot creates **fresh super admin** (installer / setup wizard) — not lab `global` password. Lab accounts stay lab-only.

---

## 3. Grey Save — not missing

On **operator** rows (e.g. `kk`, `chin` in your pic):

- **Save is there** in Actions column.
- **Grey = disabled until you change something** (tick a permission, toggle See all, pick a group, change a date).
- Change one checkbox → Save turns **blue** → click Save.

If you changed something and Save stays grey → say which row; that would be a bug.

---

## 4. Optional UX MOB (later — not this turn)

| MOB | What |
|-----|------|
| `mob-users-save-always-visible-hint` | Label: “Change a box to enable Save” |
| `mob-users-super-admin-row-hint` | One line: “Super admin — full access, no Save needed” |

---

## Apply neutral copy to running fleet

Already on ME8 files. You only need **restart + hard refresh**.  
If fleet runs from another path, say which — copy MOB there or point RESTART at ME8.
