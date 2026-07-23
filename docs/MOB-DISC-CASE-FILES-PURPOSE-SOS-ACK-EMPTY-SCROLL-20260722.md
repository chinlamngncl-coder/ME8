# MOB DISC — Case Files: what is this page? · SOS ACK? · empty scroll waste

**Status:** Purpose APPLIED · Fill layout APPLIED · **Empty scroll void still open** → `MOB-DISC-CASE-FILES-EMPTY-SCROLL-VOID-20260722.md`  
**Purpose hint:** `CASE-FILES-PURPOSE-HINT-V1` — APPLIED  
**Search:** `case files`, `what is this page`, `create from SOS`, `ack on sos`, `empty scroll`  
**Trigger:** Operator on empty Case Files list — forgot design; asks if SOS Ack lands here; unnecessary scroll with no files  
**Genre:** Evidence Hub · Case Files (not live wall / redact blur)

---

## Straight answers

### What is this page for?

**Case Files** = **incident / field-report folders** inside Evidence Hub.

| Job | Detail |
|-----|--------|
| Write a **field report** (narrative) | Title, officer, device, open/closed |
| **Link** library evidence clips into one case | Videos/photos stay in Library; case only holds links |
| Optional **link to one SOS incident id** | So report + alarm share a reference |
| Later search / reopen the case | List → Open → edit narrative / add-remove evidence |

It is **not**:

- The SOS alarm inbox / Ack screen  
- The Evidence Library (raw clips)  
- Redacted exports browser  
- Automatic dump of every Ack  

Empty (“No case files yet”) means **nobody created a case yet** — normal for a fresh lab.

### When we Ack on SOS, does it come over here?

| Question | Answer |
|----------|--------|
| Does **Ack** auto-create a Case File? | **No** |
| Does Ack move the SOS into this table? | **No** |
| Does anything appear here after Ack alone? | **No** — list stays empty until someone creates a case |

**Ack** = acknowledge / handle the live alarm (and related SOS ledger behaviour).  
**Case File** = optional **written case packet** you build afterwards (or anytime).

How SOS connects **today** (manual):

1. **Create from SOS** (button on this page) → you pick/enter an SOS incident → creates a case titled like `SOS — {officer} — {date}`, copies narrative if any, stores `sosIncidentId`.  
2. Or **New case file** → blank case → optionally set SOS link in the form.  
3. From Evidence detail → **Add to case file** → link a clip into an existing case.

So: Ack and Case Files are **cousins**, not the same pipe. Ack does **not** “come over here.”

```
SOS alarm ──Ack──► SOS ledger / alarm closed path
              │
              └── (optional, separate click) Create from SOS ──► Case Files row
Evidence clip ──Add to case──► linked under a Case File
```

---

## Unnecessary scroll (empty list) — yes, real layout bug

Same family as Redacted exports before fill-layout:

| Symptom | Cause |
|---------|--------|
| Horizontal scrollbar with **no rows** | Shared `.ss-evidence-table-wrap { overflow: auto }` + wide table / `nowrap` actions; content width > box even when empty |
| Big empty dark area below short box | List wrap still height-capped (`max-height: calc(100vh - 320px)`) but not a true fill + `overflow-x: hidden` like the Redacted exports fix |
| Feels pointless | Operator scrolls right → nothing useful |

**Not** “because there are secret files off-screen.”

---

## Recommended MOBs (order)

| # | MOB | Why |
|---|-----|-----|
| 1 | **`CASE-FILES-PURPOSE-HINT-V1`** | Stronger on-page purpose line: what Case Files is + **“SOS Ack does not auto-create cases — use Create from SOS if you want a report folder.”** Stop the “forgot the design” trap. |
| 2 | **`CASE-FILES-FILL-LAYOUT-V1`** | Same pattern as `REDACTED-EXPORTS-FILL-LAYOUT-V1`: fill height, no horizontal scroll when empty / few rows, `table-layout: fixed`, actions wrap. |

**Risk pick — do first if you only want one APPLY today:**  
**`CASE-FILES-FILL-LAYOUT-V1`** — fixes the visible waste/scroll immediately (low risk CSS).  
Then purpose hint if the page still feels mysterious.

Do **not** auto-create Case Files on every Ack unless you explicitly order a separate product MOB (that changes ops workflow and can flood this list).

---

## Verify (when layout MOB APPLIED)

| # | Test | Pass |
|---|------|------|
| 1 | Empty Case Files: **no** horizontal scrollbar chasing blank | ☐ |
| 2 | List box fills down the page; empty void reduced | ☐ |
| 3 | After one **Create from SOS**, a row appears; Ack alone still does not | ☐ |

---

## Related

- Redacted exports fill (precedent): `MOB-APPLIED-REDACTED-EXPORTS-FILL-LAYOUT-V1-20260722.md`  
- Code: `lib/caseFiles.js` (`createFromSos`), `public/js/case-files-ui.js`, `#ev-panel-case-files` in `public/index.html`  
- SOS Ack ≠ case create (this disc)

---

## Ask

- Layout: **`MOB-APPLY CASE-FILES-FILL-LAYOUT-V1`**  
- Purpose copy: **`MOB-APPLY CASE-FILES-PURPOSE-HINT-V1`**
