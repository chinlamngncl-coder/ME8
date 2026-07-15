# MOB DISC — `fr-kept` on ship · Evidence tab · professional naming

**Status:** APPLIED — `mob-fr-kept-evidence-ui` (2026-07-13)  
**Date:** 2026-07-13  
**Trigger:** Ship / client use — will `storage/fr-kept` appear automatically? Put under Evidence as “KIV for Investigation” or better words?  
**Search:** fr-kept, ship pack, Evidence tab, KIV, investigation hold  
**Related:** `MOB-DISC-FR-SNAP-MAP-ANCHOR-EVIDENCE-KEEP.md` (Keep pack APPLIED)

---

## 1) Will the folder exist for the customer?

| Question | Answer |
|----------|--------|
| Must we bake an empty `fr-kept` into the ship zip? | **No** |
| Created automatically? | **Yes** — on **Fleet/service start**, `frKeptEvidence.init()` does `mkdir` + `README.txt` |
| If init missed and someone Keeps? | **Keep** also needs the dir — init already runs at boot; first Keep writes into it |

**Ship truth:** `storage/` is runtime data (usually not in the pack). Customer install → start UbitronC2 / Fleet → `storage/fr-kept/` appears empty with README. First **Keep** fills it.

Toast points operators to **Evidence → Investigation holds**; IT path remains `storage/fr-kept`.

---

## 2) Should this live in the Evidence tab?

| Approach | Verdict |
|----------|---------|
| **Folder only** | OK for lab IT; weak for operators |
| **Evidence tab panel** | **APPLIED** — browse / open / copy ID |
| Dump into main Evidence **library** as dock FTP files | **Not v1** — different lifecycle; link later |

**Product shape (live):**

```
Evidence tab
  ├── Library (dock / vault — existing)
  ├── Case files (existing)
  └── Investigation holds   ← FR Keep packs
```

**APPLIED:** `mob-fr-kept-evidence-ui`  
- `GET /api/analytics/fr/kept` · `GET /api/analytics/fr/kept/:id/jpg`  
- `public/js/fr-kept-ui.js` + Evidence nav panel  
- Optional later: “Link to case file”

---

## 3) Naming — “KIV” or professional?

| Label | Use? |
|-------|------|
| **KIV** | Internal SOP only — not UI brand |
| **Investigation holds** | Evidence sub-panel (locked) |
| **Keep** | Map / snap button |
| Disk folder | `storage/fr-kept` (IT; UI does not require the path) |

---

## 4) Ship checklist

| Item | Owner |
|------|--------|
| Folder auto-create on start | Done |
| Do **not** require empty folder in zip | Pack SOP |
| Evidence UI for holds | **Done** (`mob-fr-kept-evidence-ui`) |
| Retention / archive of holds | Later |

---

## Verify

1. `RESTART-FLEET.bat` (or restart service) — API routes load  
2. Hard refresh console  
3. Keep an FR snap → toast mentions Investigation holds  
4. Evidence → **Investigation holds** → thumb + Open + Copy ID  
