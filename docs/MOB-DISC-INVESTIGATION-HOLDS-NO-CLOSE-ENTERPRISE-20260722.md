# MOB DISC — Investigation holds: when done? auto clear? enterprise lifecycle gap

**Status:** APPLIED — `FR-HOLDS-DISPOSITION-STATUS-V1` + `FR-HOLDS-CARD-ACTIONS-V1` (2026-07-22)  
**Search:** `investigation holds done`, `auto close`, `clear list`, `fr-kept`, `keep forever`  
**Trigger:** Operator — 2 holds on screen; “once investigation done then how? auto close? clear the list?” + UI feels non-enterprise  
**Genre:** Evidence Hub · FR Investigation holds (not Case Files, not Redacted exports)

---

## Straight answers (today’s product)

| Question | Answer **today** |
|----------|------------------|
| When investigation is done, what do I do? | **Nothing in the UI.** There is no Close / Clear / Done button. |
| Does it auto-close? | **No.** |
| Does the list auto-clear? | **No.** Holds stay until someone removes files on disk (IT) or a future MOB adds disposition. |
| Is this like Case Files “Closed”? | **No.** Case Files has Open/Closed. Investigation holds have **no status**. |
| What are Open / Copy ID for? | **Open** = preview face image. **Copy ID** = copy `frk-…` pack id for IT / logs. |

**Honest:** Investigation holds today are a **save tray**, not an investigation workflow. You Keep from FR → files land in `storage/fr-kept` → this page lists them **forever**.

```
Keep (Analytics / map) → storage/fr-kept/{id}.jpg + .json
                              ↓
                    Evidence → Investigation holds (browse)
                              ↓
                         (no exit) ← gap you hit
```

---

## What you have on screen (your shot)

| Element | What it means |
|---------|----------------|
| 2 hold(s) | Two operator **Keep** actions succeeded |
| Cards (ada, Chin) | Face snap packs with score, GPS, time |
| Open / Copy ID | Preview + copy technical id — **not** close investigation |
| Server folder (IT) path | Where files live on disk — **manual** copy for cases |

**Normal that list doesn’t shrink** — nothing tells the product you’re “done.”

---

## Why it feels non-enterprise (valid)

Same session pattern as Case Files / Redacted exports:

| Gap | Today |
|-----|--------|
| **No lifecycle** | Inbox with no Clear / Linked / Archived |
| **No default “Active only”** | Cleared items would still show (if we had status) |
| **No audit disposition** | No “who cleared / why” on the hold |
| **IT folder hint** | Enterprise ops expect **in-app** Done, not “go to server folder” |
| **Card buttons** | Open + Copy ID use global `.btn { width: 100% }` → fat stacked boxes (same class of bug as Redacted exports Detail) |
| **No link to Case file** | Formal report is separate tab; no “escalate this hold” |

This is **not** operator error. Product shipped **Keep + browse** without **disposition**.

---

## How it should behave (enterprise bar)

Do **not** auto-clear on a timer without human action. Do **not** auto-Keep every FR match.

| Stage | Behaviour |
|-------|-----------|
| **Keep** | Operator deliberately saves snap → hold appears as **Open** |
| **Working** | Open tray shows **Open** holds only |
| **Done with this snap** | **Clear hold** → reason picklist → status **Cleared** → leaves Active tray, **stays in history + audit** |
| **Formal case** | **Link to case file** → status **Linked** (Case Files stays the report home) |
| **Noise** | **Discard** (soft) or admin **Delete** later — always logged |

```
Investigation hold (one snap)
   Open ──Clear──► Cleared (history, files kept)
     │
     └──Link to case──► Linked (case file + hold ref)
```

**Ack on FR hit** clears the **live hit strip only** — it does **not** remove an Investigation hold.

---

## What already exists elsewhere (don’t duplicate)

| Feature | Where |
|---------|--------|
| Field report + evidence links | **Case Files** (Open/Closed) |
| FR Keep → disk pack | `lib/frKeptEvidence.js` |
| Browse holds UI | `public/js/fr-kept-ui.js` |
| Disposition design (paper) | `MOB-DISC-FR-HOLDS-DISPOSITION-LIFECYCLE.md` (2026-07-13) |

Case file **Closed** ≠ hold **Cleared**. Both can exist.

---

## Recommended MOBs (order)

| # | MOB | Why first |
|---|-----|-----------|
| 1 | **`FR-HOLDS-DISPOSITION-STATUS-V1`** | Clear/Close hold + Open/Cleared filter + reason + audit — answers “when done?” |
| 2 | **`FR-HOLDS-HOLD-NUMBER-V1`** | Speakable `IH-yymmdd-###` on card (not only `frk-…`) |
| 3 | **`FR-HOLDS-LINK-CASE-V1`** | Link hold → Case file; status Linked |
| 4 | **`FR-HOLDS-CARD-ACTIONS-V1`** | Compact card buttons (`width: auto`); optional table row mode when many holds |
| 5 | **`FR-HOLDS-HARD-DELETE-ADMIN-V1`** | Super-admin purge + confirm + log (last) |

**Risk pick — one APPLY for your question:**  
**`MOB-APPLY FR-HOLDS-DISPOSITION-STATUS-V1`** — without it, the list **never** behaves like enterprise investigation.

UI-only polish (`FR-HOLDS-CARD-ACTIONS-V1`) can ship in parallel if you want cards less ugly before disposition — but **Clear** is the logic fix.

---

## Verify (when disposition MOB APPLIED)

| # | Test | Pass |
|---|------|------|
| 1 | Clear one hold → disappears from **Open** list | ☐ |
| 2 | Filter **Cleared** → hold still visible with status | ☐ |
| 3 | Audit / disposition line (who, when, reason) | ☐ |
| 4 | jpg/json still on disk after Clear (not silent wipe) | ☐ |
| 5 | Keep new hold → still appears as Open | ☐ |

---

## Related open UI MOBs (same session)

| MOB | Surface |
|-----|---------|
| `REDACTED-EXPORTS-DETAIL-ACTIONS-V2` | Redacted exports Download / Open source boxes |
| `CASE-FILES-DETAIL-COMPACT-V1` | Case file open/detail scroll void |
| `CASE-FILES-EMPTY-COMPACT-V2` | Case list empty (done) |

---

## Ask

To answer “when investigation done?” in product:

**`MOB-APPLY FR-HOLDS-DISPOSITION-STATUS-V1`**

For card button ugliness only:

**`MOB-APPLY FR-HOLDS-CARD-ACTIONS-V1`**

One MOB at a time per operator rules.

---

## Code refs (today — no disposition)

- Keep API: `POST /api/analytics/fr/kept`  
- List API: `GET /api/analytics/fr/kept` — **no DELETE**  
- UI: `fr-kept-ui.js` — Open, Copy ID, Refresh only  
- Storage: `storage/fr-kept/` + `index.jsonl`
