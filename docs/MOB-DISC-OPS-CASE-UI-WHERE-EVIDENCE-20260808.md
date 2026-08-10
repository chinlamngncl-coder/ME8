# MOB DISC — Where is the Cases desk in the UI? (2026-08-08)

**Status:** disc — concrete UI placement. No code until APPLY.  
**Ask:** Individual tabs? Where? How? What?

---

## Short answer

**Not** four new top tabs (SOS / FR / ANPR / Weapon).  
**One** desk: **Evidence → Cases**.

Inside that desk: filters **SOS | Analytics**, then if Analytics → **FR | ANPR | Weapon**.  
Live alarms stay where they already are (orange Weapon toast, FR toast, SOS banner). Cases = the **filing cabinet**.

---

## Why Evidence (not Analytics, not four tabs)

| Option | Verdict |
|--------|---------|
| Top nav: separate SOS / FR / ANPR / Weapon **Cases** tabs | No — tab explosion; same search/audit UI repeated 4× |
| Inside **Analytics** only | Weak — SOS is not “analytics”; operators won’t look there for SOS |
| Inside **Ops** map only | Weak — Cases is paperwork/audit, not map |
| **Evidence → Cases** (one sub-nav) | **Yes** — Evidence already means “records / library / export.” Cases fit. |

Enterprise pattern: **alarms interrupt** on live surfaces; **case files** live in a records module.

---

## What you see (concrete)

### Top nav (unchanged)

`Ops | Evidence | Analytics | …`  
(No new top-level “Cases” tab required.)

### Evidence left nav (add one item)

```text
Evidence
  Overview
  Library
  …
  Cases          ← NEW
  …
```

### Cases screen layout (one page)

```text
┌─────────────────────────────────────────────────────────┐
│  Cases                                                   │
│  [ All ] [ SOS ] [ Analytics ]     ← family              │
│  (if Analytics) [ All ] [ FR ] [ ANPR ] [ Weapon ]       │
│  Date | Camera | User | Case ID | Search notes…          │
├─────────────────────────────────────────────────────────┤
│  List: caseId · Rev · kind · cam · time · closed by      │
│  Click row → Case detail (notes / touch log / Open snap) │
└─────────────────────────────────────────────────────────┘
```

Same Case detail you already rehearsed on Weapon History — just moved into Evidence and fed by all kinds later.

---

## How it connects to live alerts (what ≠ where)

| Event | Where it **fires** (unchanged) | Where it **files** |
|-------|--------------------------------|--------------------|
| Weapon hit | Weapon toast / HQ bar | Case → Analytics / Weapon |
| FR hit | FR toast / HQ | Case → Analytics / FR |
| ANPR critical | ANPR toast path | Case → Analytics / ANPR |
| SOS | SOS banner / ledger | Case → SOS (links ledger id) |

**Shortcut:** toast **History** / “Open case” can deep-link into **Evidence → Cases** filtered to that caseId.  
Weapon’s floating History can remain as a **quick list**, or later redirect into Cases — one APPLY decides; recommend eventually **one** Cases desk so people don’t learn two places.

---

## How (operator steps)

1. Open **Evidence**.  
2. Click **Cases**.  
3. Pick **SOS** or **Analytics** (then FR/ANPR/Weapon).  
4. Open a row → add note (operator) or Edit/Delete note (Super admin).  

No FTP. No disk browsing.

---

## Build note

UI desk = `OPS-CASE-UI-DESK-V1` (after or with server store).  
Today’s Weapon History panel = temporary rehearsal until Cases exists.

---

## What you do

Say **Evidence → Cases PASS** (or “I want a top-nav Cases tab instead”).  
Then when building: `MOB-APPLY OPS-CASE-SERVER-STORE-V1` then `OPS-CASE-UI-DESK-V1`.
