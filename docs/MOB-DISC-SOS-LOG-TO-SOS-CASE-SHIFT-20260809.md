# MOB DISC — Shift SOS LOG → SOS Case (operator is right) (2026-08-09)

**Status:** Design lock after discussion + enterprise web check. **No code until named APPLY.**  
**Operator point (accepted):** When officers press SOS (and settle Face / Plate / Weapon alerts), that is **case work**. Forcing people to learn “Ops SOS LOG” vs “Evidence Cases” vs “analytics SOS” **does not make sense**. Screenshot shows **SOS LOG** + TAG ACK + “Open incident files” — still called a **log**, not a case.

**Apology:** Earlier reply defended “Cases only after Ack” as if the empty Cases desk were fine. That ignored the real product failure: **two names for one job**. That was lazy relative to how you work the desk. This disc corrects direction.

---

## 1. What you mean (restated)

| You said | Product meaning |
|----------|-----------------|
| SOS / FR / ANPR / Weapon are “all SOS” for Ops | All are **serious alerts that must be settled as cases** — not a hobby log |
| Settling while using SOS = case | Officer expects a **case**, notes, files, reopen later |
| Don’t make users define Ops SOS vs Analytics SOS | One office language: **Cases** (with a **type**: SOS · Face · Plate · Weapon) |

Agree.

---

## 2. Enterprise check (this turn — not memory-only)

| System | Pattern | What we take |
|--------|---------|--------------|
| **Axon Records** | Call for Service → **Incident** profile → can become / auto-create **Case**; work happens on incident/case profile, not only a flash | Serious events get an **incident/case identity** early; “log” is not the office name |
| **Motorola CommandCentral Evidence / Vault** | Media + CAD/RMS **correlated into case folders**; investigators open the **case**, not a raw alarm scrapbook | End state = **case folder** |
| **Genetec Clearance / AXIS Case Insight** | Auto **case creation** / tagging from incident or case numbers when evidence lands | Auto-file into cases is normal, not exotic |
| **BWC OEM alarm UIs** | SOS alarm query + process opinions / video | Alarm exists, but agencies still file into records/cases |

**Industry does keep a live alarm layer** (toast / map / talk group).  
**Industry does not** ask operators to treat the permanent desk as a “LOG” while a second hidden “Cases” tab is the real office.

So: agreeing with you is **more** enterprise-aligned than defending “SOS LOG forever + Cases only after Ack with no bridge.”

---

## 3. Why the old ME8 split hurt

Locked earlier (still true for storage): toast ≠ filing cabinet; Cases JSON store exists; Ack wires `SO-` / `FR-` / `AN-` / `WD-`.

What went wrong for humans:

1. Ops widget titled **SOS LOG** (sounds like scrapbook).  
2. **Evidence → Cases** empty until Ack — feels like “software lost my SOS.”  
3. “Open incident files” opens a **disk folder** path, not the Cases desk.  
4. Agent talk of “ops SOS vs analytics” taught a split operators never asked for.

---

## 4. Locked direction (one path — not A/B park)

**Product truth:** One **Cases** office for SOS + Face + Plate + Weapon.  
**Ops SOS strip** = live face of the **same** SOS cases (active / recent), not a separate species named LOG.

### 4.1 Words (ship face)

| Today | Shift to |
|-------|----------|
| SOS LOG | **SOS** or **SOS cases** (never “log” on the office strip) |
| Open incident files (disk) | **Open case** → Evidence → Cases detail for that `SO-` |
| “Analytics SOS” language | Ban — say **Face / Plate / Weapon case** (types under Cases) |

### 4.2 When the SOS case is born

| Event | Behavior |
|-------|----------|
| **SOS raised** (button / alarm) | **Ensure** Ops Case `SO-…` immediately (idempotent). Evidence → Cases shows it even before Ack. |
| **SOS Ack** | Same case: status **Ack only** or seed note → **Has notes** (as today). No second case. |
| Face / Plate / Weapon Ack/dismiss | Still create/update their case types (already wired) — same Cases desk |

This matches “settling SOS = case” and fixes empty Cases after press.

### 4.3 Ops strip role after shift

Keep Ops SOS list for **speed** (last 7 days chart, quick Ack, live).  
Each row = a **case**: click opens **case** (Cases detail), not only a storage folder.

Ledger JSON / SOS incident store can remain the **media/timeline source**; Cases remains notes/audit office — **one id bridge**, one operator journey.

### 4.4 What we do **not** do

- Do not make toast the filing cabinet.  
- Do not delete SOS incident media ledger under the hood.  
- Do not rename Face/Plate/Weapon into the word “SOS” in IDs (keep `FR-` / `AN-` / `WD-`) — operators see **Cases** + type labels, not “analytics SOS.”  
- Do not invent CAD/RMS full Axon clone in one APPLY.

---

## 5. Suggested APPLY ladder (one at a time)

| # | APPLY | What |
|---|--------|------|
| 1 | `SOS-CASE-ON-RAISE-V1` | Ensure `SO-` case when SOS fires; Ack updates same case |
| 2 | `SOS-OPS-STRIP-ACTIONS-V1` | Four buttons redesign — see `MOB-DISC-SOS-OPS-STRIP-FOUR-ACTIONS-DESIGN-20260809.md` (Open case · drop CSV · Clear strip · Refresh) |
| 3 | `CASES-SUPERADMIN-REPORT-CSV-V1` | Cases desk Super admin CSV by date/time/user (not Ops) |
| 4 | `SOS-OPS-ROW-TO-CASE-V1` | Click strip row → open that case |
| 5 | (optional) Cases filter UX | When Family SOS, hide FR/ANPR/Weapon type clutter |

**Recommend start:** APPLY **1** then **2** then **3**.

---

## 6. Relation to older discs

| Disc | Update |
|------|--------|
| `MOB-DISC-SOS-CASES-VS-OPS-LEDGER-OPERATOR-20260809.md` | Explained today’s behavior; **superseded for future** by this shift |
| `MOB-DISC-OPS-CASE-SOS-WIRE-20260809.md` | Ack wire stays; **extend** with raise → ensure case |
| `MOB-DISC-WHERE-ALERTS-AND-LEDGER-LIVE-20260809.md` | Will point here after APPLYs land |

---

## 7. Decision

**Agree with operator.** Treat SOS (and Face / Plate / Weapon settles) as **cases**.  
Shift SOS LOG → SOS case language + create SOS case on raise + Open case into Cases desk.  
Discuss done; code only on `MOB-APPLY …` for a row in §5.
