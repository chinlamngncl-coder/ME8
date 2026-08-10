# MOB DISC — Industry confirm: no permanent teach line under every page (2026-08-10)

**Status:** LOCKED. **No code this turn.**  
**User point:** Seldom see enterprise software put “what this is / don’t open the folder / how long files are kept” under every panel. Check online.  
**Read:** `.cursorrules` UI COPY PROFESSIONAL.  
**Extends:** `MOB-DISC-UI-COPY-PANEL-INTRO-TITLE-ONLY-20260810.md` · enterprise-before-V2 disc.

---

## Do I get what you mean?

**Yes.**

You are not asking for “slightly shorter essays.”  
You are asking: **why is there a teaching caption on a working enterprise page at all?**

Examples you showed:

- “Browse here — no need to open the server folder.” → casual coach talk  
- “Categories control how long Library files are kept.” → restates the title **Retention**

Trained operators open **Retention** / **Holds** and work. They do not need a grey sentence explaining the obvious on every visit.

---

## Industry check (online)

| Source | What they do | What they do **not** do |
|--------|----------------|-------------------------|
| **SAP Fiori UX writing** | Short labels, buttons, messages that earn their place; remove text that does not support the task; deeper help → Companion / docs | Do **not** put a permanent “explanation” under every object page title when the title already names the job |
| **Progressive disclosure** (enterprise UX) | Show complexity when needed | Do **not** push how-to on every screen for power users |
| **Empty states** (Fiori / NN/g) | Short headline + next step **when the list is empty** | That is **not** the same as a forever teach banner above a full table |

So: **empty** or **error** → brief guidance OK.  
**Normal page with data and a clear title** → title + controls; **no teach strip**.

Your instinct matches industry. V1/V2 fixed length/bombs; they did **not** yet remove this class of chrome.

---

## Locked product rule (Mobility Axiom) — WHOLE SOFTWARE

**Not** “fix the two screenshots and stop.” Operator UI **everywhere** (Evidence, Settings, Ops, Analytics, Live, Conference, Firmware, Cloud, …):

| UI chrome | Allowed? |
|-----------|----------|
| Nav title / panel title | Yes |
| Field labels, column headers, buttons | Yes |
| Errors, confirms, **empty-state** one-liners | Yes (short, factual) |
| Permanent grey **setup-hint** that teaches what the page is / what not to do | **No — any page** — manuals teach |

If the title already says the job → **no panel intro line** (any module).

**APPLY history:** `UI-COPY-PANEL-INTRO-TITLE-ONLY-V1` = Holds + Retention only (first slice).  
**Still owed:** whole-UI hide/clear of the same chrome — after **OK to Grep**, then e.g. `MOB-APPLY UI-COPY-PANEL-INTRO-TITLE-ONLY-V2`.

`.cursorrules` + `me8-ui-copy-professional.mdc` state **WHOLE SOFTWARE** explicitly so agents cannot narrow this to two panels again.
