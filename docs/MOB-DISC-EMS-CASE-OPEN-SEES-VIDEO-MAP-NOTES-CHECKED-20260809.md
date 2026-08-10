# MOB DISC — How real Evidence systems open a Case (checked, not guessed) (2026-08-09)

**Status:** LOCKED from vendor docs (Axon Evidence / Justice + common DEMS). **No code.**  
**Operator ask:** stop mumbling — check how people do it; open case → see videos → input lots → pin location.  
**Also read:** `.cursorrules` = UI form rules + CREDIT-LEAN-HARD block (not product EMS design).

---

## Sources checked (not memory)

| Source | What it shows |
|--------|----------------|
| [Axon Evidence — Evidence details page](https://www.axon.com/help/axon-evidence/software/axon-evidence/evidence/manage-evidence/evidence-details-page.htm) | Open one evidence file → **player + tabs**: Map, Notes, Cases, file data, edit title/categories/assigned/recorded-on, location |
| [Axon — Evidence maps](https://www.axon.com/help/axon-evidence-legacy/software/evidence-local-legacy/evidence/evidence-maps.htm) | If GPS exists → **Map tab**; pin / route; **map moves with video timeline** |
| [Axon — Review Mode](https://www.axon.com/help/axon-evidence/software/axon-evidence/evidence/review-evidence/review-mode.htm) | From **Case Evidence** page → review **many files in one case**; notes / info beside player |
| [Axon Justice — Work with evidence in a case](https://www.axon.com/help/justice/software/justice/cases/manage-cases/work-with-case-evidence.htm) | Case has **Evidence tab**; play files in the case; **Case Map** if location on evidence |
| Motorola / VIDIZMO / Dekko DEMS (product pages) | Same idea: **case folder** holds media + metadata + audit; not a text list with video somewhere else |

---

## What you see in a real system (plain)

When someone opens a **Case** (or opens evidence **inside** a case):

```text
┌─────────────────────────────────────────────────────────┐
│  CASE  #12345   status   assigned   category            │
├──────────────────────────────┬──────────────────────────┤
│                              │  Title / ID / categories │
│   VIDEO PLAYER (the clip)    │  Notes (many, editable)  │
│                              │  Tags / retention        │
│                              │  Who / when / device     │
│                              │  MAP / GPS pin + route  │
│                              │  (often sync’d to play)  │
├──────────────────────────────┴──────────────────────────┤
│  Evidence list in THIS case: clip1, clip2, photo…       │
└─────────────────────────────────────────────────────────┘
```

**Locked facts from those docs:**

1. **Video is on the case screen** — not “JSON desk over here, FTP hunt over there.”  
2. **Lots of input on that same screen** — notes, title, categories, assigned, recorded-on, tags, share/export (by role).  
3. **Map / pin** — GPS from the recording; Map tab; Case Map when evidence has location; often **timeline sync** (play video → pin moves).  
4. **Case = folder of evidence files** + those fields. Evidence can be **added to a case**; one file can sit in case(s).  
5. **Audit / chain** — view/edit/download recorded (Axon product claim + DEMS norm). Browser refresh does **not** mean the case vanishes.

---

## What ME8 is today vs that picture

| Real EMS (above) | ME8 now |
|------------------|---------|
| Open case → **see / play video** | Cases = alert ticket (Open/Ack/notes). **No in-case player of docked clips** |
| Many fields on same page | Thin desk fields |
| Map pin with the evidence | Live map / SOS map exist elsewhere; **not wired as Case Map on the case page** |
| Evidence list **inside** the case | Library/FTP separate; **no bind “this clip belongs to this case” UI** |
| Durable case + audit | JSON on disk intended durable; **full audit log UI + close/settle incomplete** |

So your ask matches **Axon-class UX**. Our earlier “three lanes forever” was **wrong as the end product**. Lanes are only **how media arrives** (dock/FTP) and **how alerts start** (raise). The **operator face** must become: **one Case page = video + inputs + pin**.

---

## ME8 target (same shape, our stack)

| Piece | ME8 meaning |
|-------|-------------|
| Case page | Evidence → Cases → open one case |
| Player | Clips from **Library / your Storage-FTP path**, linked to this case |
| Inputs | Notes, disposition, status (Open → Ack → Closed), more fields later |
| Pin | GPS from alert and/or from clip metadata → map on case (pin; route later if we have track) |
| List grow | Archive/hide Closed; disk stays |

**Not:** force every alert into “Case Files” report form first.  
**Yes:** Case Files can stay as optional long report **linked** to the same case id later.

---

## Recommended APPLY order (names only)

1. `OPS-CASE-OPEN-DESK-V1` — open case page layout: **player slot + form grid + map pin** (even if player empty until bind)  
2. `OPS-CASE-BIND-EVIDENCE-V1` — attach Library/FTP clips to case so player fills  
3. `OPS-CASE-CLOSE-SETTLE-V1` + `OPS-CASE-AUDIT-LOG-V1`  
4. Map timeline sync = later polish after GPS on clip is reliable  

---

## One sentence

**Checked: Axon/DEMS open a case and show the videos, notes, and map on that case — ME8 must grow into that; ticket-only Cases is not the finished evidence desk.**

Disc related: `MOB-DISC-CASES-SETTLE-BIND-MEDIA-AUDIT-EMS-20260809.md` (updated by this check).
