# MOB DISC — Concrete ops case tree (SOS + Analytics) (2026-08-08)

**Status:** disc — **one locked recommendation**. No code until you APPLY.  
**You:** Want one case world for all — name it SOS / Analytics, then sub FR, ANPR, Weapon. Stop hedging; say how enterprise does it and what we will build.

Sorry for the soft answers. Here is the concrete design.

---

## How enterprise usually does it (one clear pattern)

Big ops platforms almost always use **both**:

1. **Taxonomy (folders / kinds)** — so humans know *what family* (SOS vs Analytics).  
2. **Unique case ID + date** — so search never depends on “similar names.”

They do **not** rely on operators inventing filenames.  
They do **not** put editable notes on FTP for staff to rewrite.

Typical shape:

```text
/cases
  /{site-or-tenant}          ← we can skip until multi-site
    /{YYYY-MM-DD}            ← day (search + backup)
      /{KIND}/               ← SOS | ANALYTICS/...
        {CASE-ID}.json       ← one case = one file (Rev chain inside)
```

UI is still one **Ops Cases** desk: filter by family → type → date → cam → user → case ID.

---

## Locked ME8 recommendation (your idea, made precise)

**Yes — one case file system for all.**  
**Yes — top split SOS vs Analytics, then Analytics subs FR / ANPR / Weapon.**  
That is logical and matches how dispatch products group “life emergency” vs “video analytics.”

### Folder tree (concrete)

```text
storage/ops-cases/
  2026-08-08/                          ← day first (backup + search)
    SOS/
      SO-20260808-<sosId>.json
    ANALYTICS/
      FR/
        FR-20260808-<hitId>.json
      ANPR/
        AN-20260808-<hitId>.json
      WEAPON/
        WD-20260808-<hitId>.json
```

### Why this order (day → family → type)

| Layer | Why |
|-------|-----|
| **Day** | Ops search “what happened today / that night”; easy backup rotate |
| **SOS vs ANALYTICS** | Different urgency / SOP; your naming |
| **FR / ANPR / WEAPON** | Different evidence fields; still same case JSON shape |
| **caseId.json** | Unique; Rev 1..N + notes + audit **inside** the file |

Same JSON schema for all kinds (`kind`, `caseId`, `rev`, `notes`, `audit`, `refs`).  
Only `refs` differs (SOS ledger id vs plate vs face hit vs weapon crop).

### UI (concrete)

One place in the product:

**Ops → Cases** (or Evidence → Cases)

Filters:

- Family: **All | SOS | Analytics**  
- If Analytics: **All | FR | ANPR | Weapon**  
- Date / camera / user / case ID / note text  

Open row → **Case** desk (add note / Super admin edit-delete / Rev badge).  
**Not** FTP. **Not** browsing those folders by hand.

### SOS special rule (locked)

SOS **truth** stays the existing SOS ledger.  
Ops case `SO-…` **links** `refs.sosId` — does not invent a second SOS database.  
Notes/Rev for “who added what after Ack” can live on the ops case; core SOS event stays ledger.

---

## What we have now vs this tree

| Now | This design |
|-----|-------------|
| Weapon History only, browser session | Same Case UI idea → later **all kinds** under `storage/ops-cases/` |
| No SOS/FR/ANPR in that tree yet | Wire after server store |

---

## Build order (concrete APPLYs — one at a time)

| # | You type | What you get |
|---|----------|----------------|
| **1** | `MOB-APPLY OPS-CASE-SERVER-STORE-V1` | Create tree above + API create/read/add-note/edit-delete (role gate on server) |
| **2** | `MOB-APPLY OPS-CASE-WEAPON-MIGRATE-V1` | Weapon History writes into `…/ANALYTICS/WEAPON/` instead of session only |
| **3** | `MOB-APPLY OPS-CASE-UI-DESK-V1` | Ops **Cases** page with SOS / Analytics filters |
| **4** | `MOB-APPLY OPS-CASE-FR-WIRE-V1` | FR hits open/create FR cases |
| **5** | `MOB-APPLY OPS-CASE-ANPR-WIRE-V1` | ANPR critical hits → ANPR cases |
| **6** | `MOB-APPLY OPS-CASE-SOS-WIRE-V1` | Link SOS ledger → SOS cases |

**Recommendation:** start with **1** when you say APPLY — without it, “one folder for all” is only a drawing.

---

## Rejected (so we stop circling)

- Flat one folder of `kk_rev2.txt` names  
- Operators FTP-editing notes  
- Separate note systems per FR/ANPR/Weapon with different UIs forever  

---

## What you do

Say **tree PASS** (or change: e.g. family before day).  
Then: `MOB-APPLY OPS-CASE-SERVER-STORE-V1`
