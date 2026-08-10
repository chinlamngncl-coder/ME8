# MOB DISC — Where is Library? How do I get a file to link? Easier way? (2026-08-09)

**Status:** LOCKED plain guide + next UX. **No code this turn.**

---

## 1. What “Library (your Storage/FTP)” means

| Word | Plain meaning |
|------|----------------|
| **Storage / FTP** | Folder path **you** set under Evidence → **Storage** (and docking). Cameras / dock put video **there**. |
| **Evidence Library** | The **UI list** of those files (Evidence & Docking → **Evidence Library**). |
| **File id** | Internal id for one row in Library (what bind “paste id” wants today). |

You do **not** upload inside the Case desk. Files arrive by **dock / ingest / existing Library**, then you **link** them to a Case.

---

## 2. Where can I get it? How? (today)

**Step by step:**

1. Open **Evidence & Docking**.  
2. Open **Evidence Library**.  
3. Find the clip (same camera / time as the SOS).  
4. Open that row (detail).  
5. Copy the **evidence file id** from the detail (id shown on the file).  
6. Go **Cases** → open the case → paste into **Link Library file** → **Link**.

**If Library is empty:** dock the BWC / wait for upload / check **Storage** path is the folder that actually receives files. No path = nothing to list.

**Redacted copy:** after Redact → **Redacted exports** (safe copy). Bind today expects a **Library** file id; linking a redacted export id may need a later APPLY if export ids differ.

---

## 3. Why it feels confusing

Paste-id is a **lab wire**, not finished EMS. Real desks pick from a list (“Add evidence to case”) — we said that in the EMS check; bind v1 was links-only first.

---

## 4. Easier way (locked direction — APPLY later)

| Better UX | What officer does |
|-----------|-------------------|
| **Recommend** | On Case desk: **Browse Library** → filter by this camera / day → tick clip → Add (no paste) |
| Also good | From Library detail: **Add to this Case** (pick open case / case id) |
| Keep | Optional paste id for Super admin / support |

**Proposed APPLY name:** `OPS-CASE-BIND-LIBRARY-PICKER-V1`  
(After GPS minimap if that is still first trust fix.)

---

## 5. One picture

```text
Dock / camera upload
        ↓
 Storage folder (you set in Evidence → Storage)
        ↓
 Evidence Library  ←—— you look here
        ↓
 Link into Case (today: paste id · later: picker)
```

---

## One line

**Library = Evidence Library list of files on your Storage path; today copy file id from a Library row; easier way = Browse/picker on the Case desk (APPLY later).**
