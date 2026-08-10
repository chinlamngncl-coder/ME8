# MOB DISC — Continue as Case File (MOB prompt) + pending queue update (2026-08-10)

**Status:** LOCKED paper. **No code.**  
**Rules:** User said Mob disc + read `.cursorrules` → zero product edits until exact `MOB-APPLY …`.

**Prior lock:** Cases vs Case Files why-two + PDF talk = `MOB-DISC-CASES-VS-CASE-FILES-WHY-TWO-AND-PDF-20260810.md`.

---

## MOB prompt (copy / paste when ready)

```text
MOB-APPLY CASE-FILE-CONTINUE-FROM-OPS-CASE-V1

Scope (exact — do not bundle):
1. On Ops Case desk (Evidence → Cases → open case): add one clear button
   “Continue as Case File” (plain English, no lab jargon).
2. Click → create (or open if already linked) a Case File that stores
   linkedCaseId = this Ops Case id.
3. Seed Case File from Case (copy what exists, do not invent media):
   - title / camera / type hint from Case
   - short starter narrative from latest notes cards (or empty if none)
   - evidence link ids already on the Case (as Case File attachments / links
     using existing Case Files link APIs — no paste-id as primary UX)
4. After create: jump operator to that Case File detail (or Case Files list
   focused on the new row) — same spirit as CASE-FILES-SAVE-JUMP-LIST-V1.
5. Both sides show “Linked”: Case desk shows linked Case File id/title;
   Case File shows linked Ops Case id (open Case on click if easy).
6. Optional path: when creating a Case File manually, “Link to existing Case”
   picker (search Cases) — same link field; not required for V1 if button
   on Case desk alone ships first.

Out of scope for this APPLY:
- Auto-create Case File on every alert
- PDF print
- FTP forced copy
- Changing Cases note permission model
- Library picker / dock dual-record (separate MOBs)

Verify:
- Operator: open Case → Continue as Case File → lands in Case File with link
- Re-click same button → opens existing linked Case File (no duplicate spam)
- Hard refresh; cache-bust touched JS only
- CREDIT-LEAN: only the few named files this APPLY needs

Disc after PASS: MOB-DISC-CASE-FILE-CONTINUE-FROM-OPS-CASE-APPLY-YYYYMMDD.md
```

**Recommended APPLY name:** `CASE-FILE-CONTINUE-FROM-OPS-CASE-V1`  
**Do not start code until user pastes that line.**

---

## After this MOB — pending queue (updated 2026-08-10)

Order = recommended pick order unless you override. **One APPLY at a time.**

| # | Status | Item | Notes |
|---|--------|------|--------|
| — | **NEXT when you APPLY** | `CASE-FILE-CONTINUE-FROM-OPS-CASE-V1` | This disc’s MOB prompt |
| 1 | Open | `OPS-CASE-BIND-LIBRARY-PICKER-V1` | Kill paste-id as primary; pick from Library |
| 2 | Open (lab) | Dual record / dock matchback **PASS** | Code path exists; lab Part 2 dock **DELAYED** until dock station; Part 1 SOS Record still operator test |
| 3 | Open | `OPS-CASE-DUAL-RECORD-AUTO-DOCK-MUST-V1` | Prove/auto both HQ + ground clips on same Case after dock |
| 4 | Open (audio) | **Alert / SOS sound reliability** | `HQ-ALERT-AUDIO-V1` applied; `SOS-ALERT-AUDIO-RELIABLE-V1` applied in arc — **operator re-PASS still owed** if tone still flaky (`MOB-DISC-CREDIT-BURN-AND-SOS-SOUND-FLAKY-20260809.md`). Optional later: custom siren library / synced volume |
| 5 | Open | `EVIDENCE-RETENTION-CATEGORIES-V1` | Evidence → Retention |
| 6 | Open | `EVIDENCE-DELETE-QUEUE-7D-V1` | Delete queue |
| 7 | Open | `REDACT-LICENSE-GREY-BUTTON-V1` | Redact grey if unlicensed |
| 8 | Parked / later | Weapon Track B Colab + `WEAPON-B-NEGATIVES-RELOAD-V1` | When GPU free |
| 9 | Parked | WVP live video ladder | When live genre returns |
| 10 | Pack-time only | Dock identity manuals / OEM ban scan | Not ordinary session |
| 11 | Your call | Unauthorized note-scroll JS patch | Leave as-is **or** `MOB-APPLY OPS-CASE-NOTE-SCROLL-REVERT-V1` |

### Alerts sound — honest status

- Shared HQ tones + Settings: marked **done** on older open-arcs (`HQ-ALERT-AUDIO-V1`).  
- Flaky SOS (sometimes silent / after speak): **still an open operator concern** — treat as **pending verify / possible follow-up APPLY**, not “forget audio forever.”  
- Do **not** start audio code until you name an audio APPLY (e.g. retest first, then `SOS-ALERT-AUDIO-FOLLOWUP-V1` if fail).

### Done in Cases genre recently (do not re-open as unfinished)

Ops Case desk, bind evidence (paste path), archive hide, GPS + Leaflet map, note cards model (add = cards; edit/delete = Super admin), Cases vs Case Files why-two (paper).

---

## Agent rules (restated)

1. This message = paper. No product file edits.  
2. Next product work only after exact `MOB-APPLY CASE-FILE-CONTINUE-FROM-OPS-CASE-V1` (or another named row above).  
3. After that MOB PASSes, advance this pending table (do not drop audio / dock / retention).
