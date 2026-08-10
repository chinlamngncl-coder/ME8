# MOB DISC — Alert history: Weapon vs FR/ANPR + Ack clears all + overflow (2026-08-08)

**Status:** disc only. **Hold** `WEAPON-ALERT-HISTORY-RETRIEVE-V1` until this scope is locked.  
**You asked:** Is history Weapon-only? Can FR/ANPR too? One Ack cleared all captures — fix that. Worry about non-Ack overflow.

---

## 1. History — Weapon only, or FR + ANPR too?

**Named MOB was Weapon-first.** Your need is fair: same ops pain on FR and ANPR.

| Approach | Meaning |
|----------|---------|
| **A — Weapon first, then clone** | Build retrieve for Weapon → copy pattern to FR → ANPR (safer, one APPLY each) |
| **B — Shared alert history shell first** | One “Alert history” tray for all three, then fill each type | Bigger first MOB |

**Recommendation: A.**  
Same *idea* for all three, but **one surface per APPLY** so we don’t break FR/ANPR while fixing Weapon.

Order later:

1. Weapon history retrieve  
2. `FR-ALERT-HISTORY-RETRIEVE-V1`  
3. `ANPR-ALERT-HISTORY-RETRIEVE-V1` (or shared tray MOB after two PASS)

---

## 2. Why one Ack felt like “clear everything” (real bug)

Weapon toast code **does not** have “Ack all.”

What it **does** do (problem):

- If the **same camera** (`kk`) fires again → it **replaces** the current toast / queue slot instead of keeping each capture.  
- So many snaps from `kk` collapse to **one** pending alert (always the latest).  
- One **Ack** → queue empty → orange gone → feels like “all captures Ack’d.”

So your Recent/lightbox still had many snaps, but the **alarm queue only held one**.

**This must be fixed before / with history**, or history + Ack will still feel wrong.

**Proposed MOB (do this next):**  
`WEAPON-ALERT-ACK-ONE-HIT-V1`

- One Ack = dismiss **one hitId** only.  
- Same cam can have **several** queued hits (cap per cam, e.g. last 5).  
- Badge **+N** = real pending count.  
- Explicit **Ack all** only if you ask later (separate, labeled).

---

## 3. Overflow of non-Ack’d alerts

If we stop collapsing same-cam hits, the queue can grow.

**Simple caps (lock in ACK-ONE-HIT or small follow-up):**

| Cap | Suggestion |
|-----|------------|
| Toast queue | max **20** total (already roughly there) |
| Per camera | max **5** pending (oldest drop or merge to history) |
| When full | new hit → push oldest off toast queue **into History** (not delete forever) |
| History list | keep last **N** (e.g. 100–200) or **24–48h**, then age out |

So: toast stays workable; History absorbs overflow; nothing “silent forever delete” without a rule.

---

## 4. Arranged order (no GPU needed)

| # | You type | What |
|---|----------|------|
| **1 DONE** | `WEAPON-ALERT-ACK-ONE-HIT-V1` | One Ack = one hit; same cam queues (max 5/cam, 20 waiting); no cam overwrite |
| **2 DONE** | `WEAPON-ALERT-HISTORY-RETRIEVE-V1` | Ack/dismiss/overflow → History panel; Open reopens snap lightbox |
| **3 DONE** | `WEAPON-CASE-ADDON-AUDIT-V1` | Case add-on notes; every touch logs time + username (session) |
| **2** | `MOB-APPLY WEAPON-ALERT-HISTORY-RETRIEVE-V1` | After Ack / overflow: open list, re-open snap |
| **3** | `MOB-APPLY WEAPON-CASE-ADDON-AUDIT-V1` | Add-on + time + username |
| **4** | Super Admin gate / FP / Report | as planned |
| **5+** | FR then ANPR history (same pattern) | after Weapon history PASS |

Colab BOTH train stays **parked** (GPU) until Mon reminder.

---

## 5. What we are **not** doing in this disc

- No code yet (you asked Mob disc after the APPLY name).  
- No FR/ANPR code in the Weapon Ack MOB.  
- No silent Ack-all.

---

## What you do

1. Hard refresh.  
2. Let several Weapon hits fire on the **same** cam (`kk`). Expect toast **+N** (not one overwrite).  
3. Ack once → next hit appears; orange stays until each is Ack’d.  
4. Next APPLY when ready: `MOB-APPLY WEAPON-ALERT-HISTORY-RETRIEVE-V1`
