# MOB DISC — Linked evidence: officer doesn’t know the ID — simplify without tab hopping

**Status:** DISC only — **no APPLY**  
**Date:** 2026-07-22  
**Trigger:** Operator — “What if officer don’t know number? Anyway to simplify? At least they don’t have to jump around pages to find case number.”  
**Search:** `link evidence`, `evidence id`, `case files picker`, `add to case`, `promptAddToCase`  
**Related:** `MOB-DISC-CASE-FILES-FOUR-GAPS-20260722.md` (item 2) · `CASE-FILES-LINKED-EVIDENCE-HINT-V1` (copy only)

---

## Straight answer

**Today the officer must know (or hunt) an Evidence ID** — a long hash from **Evidence Library**. That is **bad UX** for field staff. You are right.

**They do NOT paste a case number** in Linked evidence — that field is **Evidence ID** (library clip). Confusion is part of the problem.

**There is already a reverse path** (many operators never find it):

| Direction | Where | How |
|-----------|--------|-----|
| **Library → Case** | Evidence Library → open a clip → **Add to case file** | Picks case from list (`promptAddToCase`) — **no ID typing** |
| **Case → Library** | Case file → Linked evidence | Paste Evidence ID — **hard way** |

So we built **half** the workflow. Case → link is still the painful direction.

---

## What officers actually have

| They know | They don’t know |
|-----------|-----------------|
| Officer name, BWC id, date/time, filename-ish label | 64-char Evidence ID |
| “The clip from this morning on BWC 3” | Which tab to copy from |

---

## Options (risk order)

| MOB | What | Jump tabs? | Effort |
|-----|------|------------|--------|
| **A — Hint only** `CASE-FILES-LINKED-EVIDENCE-HINT-V1` | Explain ID vs case ID; link to open Library | Still yes | Low |
| **B — Recent clips list** `CASE-FILES-LINK-RECENT-V1` | Right pane: last N uploads (filename, officer, time) → **Link** button | **No** | Low–med |
| **C — Search picker** `CASE-FILES-LINK-EVIDENCE-PICKER-V1` | Search box (name/officer/device/date) → results from `/api/evidence/catalog` → click **Link** | **No** | Med |
| **D — Split library drawer** | Full library browser embedded in right pane | **No** | High |

**Agent pick:** **B then C** — Recent covers 80% lab (“just docked”); search picker covers the rest. Do **A (hint)** in same pass as B for zero confusion.

---

## Recommended v1 — `CASE-FILES-LINK-RECENT-V1` + hint

### In scope

1. Under **Link evidence** bar, show **Recent from library** (e.g. last 15 active clips):
   - Columns: file label, officer, uploaded time
   - **Link** per row (calls existing `POST /api/case-files/:id/evidence`)
2. Keep paste field for power users / IT.
3. Hint line: *Pick a recent clip below, or paste Evidence ID from the library.*
4. API: reuse `GET /api/evidence/catalog?pageSize=15&sort=recent` (or existing catalog query).

### Out of scope v1

- Barcode / QR
- Link by case number (wrong object)
- Auto-link all BWC clips for a day (needs rules MOB)

### Verify

| # | Test | Pass |
|---|------|------|
| 1 | Open case → see recent clips **without** leaving Case Files | ☐ |
| 2 | Click **Link** on a row → appears in linked table | ☐ |
| 3 | Paste ID still works | ☐ |
| 4 | Officer does not need to memorize hash | ☐ |

---

## v2 — `CASE-FILES-LINK-EVIDENCE-PICKER-V1`

- Search input in right pane (same filters as library: q, period, device)
- Paginated mini-table, **Link** action
- Still no tab switch

---

## Ask (order)

1. **`MOB-APPLY CASE-FILES-LINKED-EVIDENCE-HINT-V1`** + **`MOB-APPLY CASE-FILES-LINK-RECENT-V1`** (can ship hint with recent in one APPLY if you name both)  
2. Later: **`CASE-FILES-LINK-EVIDENCE-PICKER-V1`**

---

## Note on “case number”

If operator meant **case ID** when linking *from* library: reverse flow (**Add to case file** on evidence detail) already lists cases by **title + CF-id** — still clunky (`window.prompt`) but no hash. Improving that picker is a separate MOB (`CASE-FILES-PICK-CASE-MODAL-V1`) — not this DISC.
