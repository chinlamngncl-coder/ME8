# MOB DISC — SOS just pressed: why Cases is empty · use Ops ledger (2026-08-09)

**Status:** Explains **today’s** behavior (Ack-only filing).  
**Superseded for future product:** operator agreed shift — see `MOB-DISC-SOS-LOG-TO-SOS-CASE-SHIFT-20260809.md` (case on raise + stop calling it LOG).  
**Screenshot (2026-08-09):** Cases empty after press — expected under **old** Ack-only rule; that UX is what we are changing.

---

## Short answer

| Question | Answer |
|----------|--------|
| I pressed SOS on Ops — why nothing in **Evidence → Cases**? | Cases only get a row when you **Ack** the SOS (office starts at Ack). Press alone ≠ file a case. |
| So do I need the ledger on the Ops page? | **Yes** — for live SOS / incident list / timeline / dual media, use **Operations → SOS ledger**. |
| When does Cases show SOS? | After **Ack** on that SOS → one `SO-…` case appears under Evidence → Cases (Family SOS). |

---

## Two desks (do not mix)

```text
Operations (Ops)
  └─ SOS ledger / alarm handling
       • New SOS appears here when pressed
       • Record, live, Ack, notes on alarm
       • This is the “something happened” list

Evidence → Cases
  └─ Office after Ack
       • Only acknowledged SOS / Face / Plate / Weapon
       • Notes, Ack only / Has notes, audit filters
       • Not a live firehose of every SOS button press
```

Locked wire: `MOB-DISC-OPS-CASE-SOS-WIRE-20260809.md` — **filing starts at Ack**, not at raise. No backfill of old ledger rows unless a later APPLY says so.

---

## What you should do now (test Part 1)

1. Stay on **Operations** → open **SOS ledger** — your just-pressed SOS should be there.  
2. **Ack** that SOS (empty note → Cases status **Ack only**; typed note → **Has notes**).  
3. Then **Evidence → Cases** → Family **SOS** → Refresh → expect `SO-…` row.  
4. Searching Cases before Ack will always find nothing for that press.

Dock Part 2 still delayed (no station) — separate disc.

---

## UI confusion (optional later — not this disc’s APPLY)

On Cases, when Family = **SOS**, the **Type** dropdown still lists FR / ANPR / Weapon (analytics). Harmless for empty list, but looks wrong. Optional later: `OPS-CASE-UI-SOS-TYPE-FILTER-V1` (hide analytics types when Family = SOS). **No code until named APPLY.**

---

## Do we change product to auto-list every SOS press in Cases?

**Default locked: No.** Toast/ledger = alarm; Cases = office after Ack (industry pattern already locked).  
If you later want “every SOS raise creates a Case before Ack,” that is a **new** named APPLY — not silent change.

---

## Agent rules

1. When operator says “SOS not in Cases” after press only → point here + Ops ledger; do not claim Cases is broken.  
2. After Ack with still-empty Cases → then diagnose wire/API (different problem).  
3. Update `MOB-DISC-WHERE-ALERTS-AND-LEDGER-LIVE-20260809.md` pointer if needed — same story.
