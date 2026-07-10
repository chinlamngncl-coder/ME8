# MOB DISC — FR crop → alarm → what next? (enterprise SOP)

**MOB DISC ONLY — no code.**  
**Date:** 2026-07-10  
**Search:** `crop rail`, `fr-alarm`, `Ack`, `watchlist`, `dossier`, `SOP`, `ax-fr-crop-card`  
**Trigger:** Offline/live crops work; operator presses alarm → **Ack only** → no dossier / watchlist path; crop cards **too big**; need enterprise next-step logic.

**Pin stack:** still parked (`MOB-DISC-MAP-PIN-RESTORE-GOLD.md`) — do **not** mix into this genre.

---

## What you have today (honest)

| Piece | Status |
|-------|--------|
| Detect / crop | Works (live + offline video) |
| Match alarm modal | Name · score · cam · grade/reason · live crop vs enrolled photo |
| Actions | **Ack** · **Dismiss** only |
| Crop rail | Cards show cam id + “1 face” / score; **not clickable**; ~huge thumbs; keep up to **24** in DOM |
| After Ack | Modal closes · socket audit event — **no** open Watchlist, **no** dossier drawer, **no** “what do I do next” |

So detection is ahead of **operator workflow**. That feels “too little logic and link” because it is.

---

## What others do (enterprise pattern)

Industry FR (e.g. FindFace→Genetec alarm procedure, Mission Control–style incident SOP, Milestone alarm manager):

```
Detect face → Match watchlist?
    │
    ├─ No match  → investigation thumb (optional enroll / ignore)
    └─ Match     → ALARM / INCIDENT
                      │
                      ├─ Show: live crop + enrolled photo + name + score + list/grade + camera
                      ├─ Show: live video context (tile / playback)
                      ├─ Operator SOP steps (guided)
                      ├─ Resolve: Ack / False positive / Escalate + note
                      └─ Audit: who · when · action · hit id
```

**Alarm is not the end — it is the start of triage.**  
Ack without “open dossier / go to list / mark false” is a toy, not a SOC product.

---

## Ubitron target SOP (locked intent — product bar)

### A. Crop rail (always on during watch / offline job)

| Rule | Spec |
|------|------|
| Visible capacity | **~8** compact cards in the rail viewport |
| Replace policy | **Newest on top**; drop oldest beyond 8 (FIFO from bottom) |
| Card size | Compact thumb (~56–72 px tall) + 2-line meta — not poster-size |
| Non-match card | Face · device label (not raw long id) · time · “No match” |
| Match card | Red border · **name** · grade chip · score% · device label |
| Click card | Opens **detail** (same payload as alarm if match; crop-only sheet if not) |

### B. On match — alarm (interrupt)

Modal / panel must show at minimum:

1. Live crop **vs** enrolled photo  
2. Display name · grade · reason · score · device · time  
3. **Primary actions (enterprise minimum):**

| Action | Meaning |
|--------|---------|
| **Ack** | Operator saw it — close interrupt; keep in rail / hit log |
| **Open dossier** | Jump to Watchlist tab + open that person’s drawer |
| **Watch live** | Focus FR tile / pin that cam (if online) |
| **False positive** | Ack + tag FP (audit) — do not treat as confirmed sighting |
| **Dismiss** | Close without Ack semantics (or merge with FP later) |

Optional v1.1: **Add note**, **Escalate**, map pin jump.

### C. After Ack — “what next?” (SOP text for operators)

Printable one-pager for training:

1. **Verify** — crop vs enrolled photo; score vs threshold.  
2. **Context** — which BWC / where (device label, later map).  
3. **Decide** — real sighting → Ack + Open dossier / notify supervisor per site policy; wrong face → False positive.  
4. **Record** — system already audits hit + ack; add note when we ship notes.  
5. **Continue watch** — rail keeps last 8; do not clear on Ack.

### D. Non-match crops (investigation lane)

Click → small sheet: crop · device · time · actions **Add to Watchlist** (opens enroll with this crop) · Dismiss.  
(Parked as follow-on if enroll-from-crop needs a separate MOB.)

---

## Gap vs now (why it feels empty)

```
NOW:     crop → (match?) → modal → Ack/Dismiss → gone
ENTERPRISE: crop → rail(8) → match alarm → triage actions → dossier/live/FP → audit → continue
```

Missing links today:

- Crop card **click**  
- **Open dossier / Watchlist** from alarm  
- **False positive** path  
- Compact **8-card** rail  
- Human **device label** instead of long numeric id on cards  
- Operator **SOP** doc (this DISC + short `docs/FR-OPERATOR-SOP.md` when applying)

---

## Proposed MOBs (one at a time — you pick order)

| # | MOB | Scope | Risk |
|---|-----|--------|------|
| 1 | `mob-fr-crop-rail-8-compact` | CSS + `cropRailMax = 8`; compact card; newest-top drop bottom | Low |
| 2 | `mob-fr-alarm-actions-dossier` | Alarm buttons: Open dossier (Watchlist + drawer), Watch live; richer meta on card click for matches | Med |
| 3 | `mob-fr-alarm-false-positive` | FP action + audit reason code | Med |
| 4 | `mob-fr-crop-enroll-from-rail` | Non-match → prefill enroll cropper | Med (after 1–2) |
| — | SOP doc | `docs/FR-OPERATOR-SOP.md` ship with #2 | Doc only |

**Suggested apply order:** **1 → 2** (density + links), then 3, then 4.  
Do **not** bundle with pin restore.

---

## Out of scope (park)

- Full Genetec-style dynamic SOP engine / incident graph  
- Auto-dispatch SMS/email (later Centre / notify genre)  
- Pin stack / Open All layout  
- Changing match threshold defaults  

---

## Success criteria (when we apply)

| Check | Pass |
|-------|------|
| Rail | ~8 compact cards; new replaces from top; old fall off bottom |
| Match alarm | Open dossier lands on that watchlist person |
| Ack | Still closes interrupt; rail retains the match card |
| FP | Audited; operator-clear language |
| Operator | Can answer “I got a crop/alarm — what do I do?” from SOP |

---

## Bottom line

Cropping **works**. Enterprise value is **triage after the crop**: compact rail → alarm with **dossier / live / FP** → audit → keep watching.

Reply with which MOB to apply first (recommend **`MOB-APPLY mob-fr-crop-rail-8-compact`**), or say apply **1+2** as two separate turns.
