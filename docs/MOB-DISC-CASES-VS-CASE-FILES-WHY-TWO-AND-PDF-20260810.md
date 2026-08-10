# MOB DISC — Cases vs Case Files (why two) + PDF + bigger reports (2026-08-10)

**Status:** LOCKED paper only. **No code.**  
**Agent fault (this thread):** User said Mob disc + read `.cursorrules`; agent still patched `ops-cases-ui.js` without MOB-APPLY. Violates `me8-zero-change-without-apply`. Unauthorized scroll patch stands until user orders revert APPLY or leave it.

---

## Why two things? (simple English, not short)

Think of a police / security desk with **two different kinds of paper**, not one folder doing both jobs.

### 1. Cases (Evidence → Cases) — the **alert ticket**

Something happened on the radio wall: SOS, weapon hit, plate hit, face hit. The system opens (or you open) a **Case**.

A Case answers: *What alert? Which camera? When? Did we acknowledge? What short notes did the desk leave? What activity happened? Which clips are linked? Where was GPS?*

It is built for **speed and ops**. Notes are **small cards** you keep adding. It is not meant to be a long investigation essay. Video still lives in Library / FTP; the Case mostly **points at** those files.

**Everyday use:** night operator hears alert → opens Case → sees context → adds a note → moves on.

### 2. Case Files (Evidence → Case Files) — the **written report / case jacket**

A Case File is closer to: *We are writing up this matter for the record / court / client / supervisor.* Longer narrative, forms, attachments arranged as a **report package**.

It answers: *What is the full story we are documenting? What report sections? What evidence package goes with the write-up?*

**Everyday use:** someone sits down later (or on scene with time) and **writes** a proper report — not just a one-line ops note.

### Same event, two roles

One SOS on Monday can have:

- a **Case** (desk ticket from the alert — notes, ack, linked clips), and  
- later a **Case File** (bigger written report that may *refer to* that same event / camera / clips).

They are **side by side**, not “Case must become Case File” and not “everything lives only in Case Files.”

| | Cases | Case Files |
|--|--------|------------|
| Born from | Alert / ops desk | Someone writing a report |
| Length | Short notes + audit | Longer report body |
| Media | Links / play from desk | Report + linked evidence as package |
| Job | Run the incident now | Document the matter properly |

**Logic of having two:** mix them and you either slow the night desk with report forms, or you lose a serious write-up path because ops tickets stay too thin. Two lanes keep both jobs clear.

---

## Can we print as PDF?

**Today (product truth on paper):** Ops Case desk is a **screen** in Evidence → Cases. There is **no** locked “Print Case as PDF” button as a finished ship feature from this disc.

**Logical later (design only — needs its own MOB-APPLY if you want it):**

- **Print / PDF the Case ticket** — one or two pages: id, camera, status, notes cards, activity, list of linked file names. Good for shift handoff.  
- **Print / PDF a Case File** — the bigger report (more natural place for a formal PDF).  

Recommendation: if you want one PDF first, prefer **Case File PDF** for “official paper,” and optional **Case summary PDF** for ops. Do not invent a silent print path without APPLY.

---

## If Case Files should “have this Case” and continue bigger reports — how? Is it logical?

**Yes, logical** — as an **optional link**, not a forced pipeline.

**How (design, not built until APPLY):**

1. Operator finishes or works an **Ops Case** (ticket).  
2. On Case desk (or Case Files create): **“Continue as Case File” / “Link to Case File”**.  
3. System creates (or opens) a Case File that stores: `linkedCaseId` (and maybe camera, SOS id, evidence links copied as starting attachments).  
4. Writer expands the **Case File** into the big report. Ops Case stays the live ticket; Case File is the report shelf.  
5. Later, opening either side can show “linked to …” so you do not hunt.

**Wrong design:** auto-forcing every Case into Case Files + FTP. Alerts would spam empty reports.  
**Right design:** ticket always; **promote / link** when someone needs a bigger report.

Named MOB when you want it (example only): `CASE-FILE-LINK-FROM-OPS-CASE-V1` — discuss → you MOB-APPLY → then code.

---

## How you find things (operator)

- Alert ticket, notes cards, desk media/map → **Evidence → Cases**.  
- Long write-up → **Evidence → Case Files**.  
- Video/photo files → **Library / storage path you set**.

---

## Agent compliance (this disc)

- Paper only. No product edits from this message.  
- Unauthorized prior JS change: leave or revert only on your named APPLY.
