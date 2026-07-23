# MOB DISC — How do we clear Prior exports (Finalized list)?

**Status:** APPLIED 2026-07-22 — `MOB-APPLIED-REDACT-PRIOR-EXPORTS-CLEAR-FINALIZED-V1-20260722.md`  
**Mode:** Was paper until named `MOB-APPLY` — now shipped  
**Search:** `clear prior exports`, `clear finalized`, `how delete download list`, `remove redacted`  
**Trigger:** Screenshot — **Prior exports → Finalized — ready to download** (only Download buttons; no Remove)  
**Genre:** Evidence redact declutter  
**Related:** `MOB-APPLIED-REDACT-PRIOR-EXPORTS-CLEANUP-V1-20260722.md` (drafts only)
---

## Straight answer

**You cannot clear Finalized rows from the UI today.**  
That is intentional in cleanup **v1** — only **Note pending / draft** could be removed. Your screenshot is **only Finalized**, so there is **no Remove / Clean** on purpose.

| What you see | Can clear in UI now? |
|--------------|----------------------|
| **Finalized** + Download | **No** |
| **Note pending / Draft** + Remove / Clean drafts | **Yes** (Super admin; server must have cleanup API — restart if Clean failed earlier) |
| **Custody trail** (below) | **No** — audit history; do not wipe |

**Original library clip** is never deleted by Prior exports cleanup.

---

## Why Finalized was locked

Finalized = registered redacted copy meant for **Download / custody use**.  
Casual “Clear all” next to Download risks wiping the only usable export. v1 chose: tidy drafts first; keep Finalized.

So the list **will keep Finalized rows** until a new MOB allows delete with a strong confirm.

---

## What you can do **right now**

### A — You only care about drafts (not this screenshot)
1. Restart server + Ctrl+F5  
2. If a **Still need Finalize** section exists → **Clean drafts** / **Remove**  
3. Finalized section stays (like your shot)

### B — You want these Finalized rows gone (this screenshot)
| Path | How |
|------|-----|
| **Product (needed)** | New MOB below — not shipped yet |
| **IT / lab only** | Delete matching files under `storage\evidence-exports\{evidenceId}\EXP-…_redacted_….mp4` **and** matching `evidence_exports` DB rows — easy to get wrong; not operator path |
| **Workaround** | Keep them; Download what you need; ignore extras — they are copies, not the source |

### C — Do **not**
- Expect **Dismiss** on the pending banner to clear Finalized (it doesn’t even clear drafts)  
- Expect SOS Ack / Case Files to clear this list  

---

## Recommended next MOB

**Name:** `REDACT-PRIOR-EXPORTS-CLEAR-FINALIZED-V1`

### In scope
1. Super-admin **Remove** on each **Finalized** row (after confirm).  
2. Confirm text must say: deletes redacted **copy** + Download goes away; **original evidence stays**.  
3. Optional: typed confirm `DELETE` when removing more than one, or a **Clear finalized for this clip** with typed confirm.  
4. Audit: `evidence.redact_finalized_removed` (custody shows the remove — trail itself not wiped).  
5. Disk file + DB row deleted together (same as draft cleanup).

### Out of scope
- Auto-retention cron  
- Wiping custody / audit_log  
- Deleting the source library file  

### Risk
**Medium–high** — irreversible for that export. Needs Super admin + hard confirm. Worth it if the Finalized pile is the real clutter (your shot).

### Order vs other open MOBs
1. If Clean drafts still broken / “IT admin” alert → `REDACT-CLEAN-DRAFTS-HONEST-ERROR-V1` first  
2. Then **`REDACT-PRIOR-EXPORTS-CLEAR-FINALIZED-V1`** for this list  

---

## Verify (when Clear-Finalized APPLIED)

| # | Test | Pass |
|---|------|------|
| 1 | Remove one Finalized → gone from Prior exports + file gone from `evidence-exports` | ☐ |
| 2 | Original source clip still in Library | ☐ |
| 3 | Custody shows remove line; history not mass-wiped | ☐ |
| 4 | Confirm required — no one-click silent wipe | ☐ |

---

## Ask

To unlock UI clear of what you see in the screenshot:

**`MOB-APPLY REDACT-PRIOR-EXPORTS-CLEAR-FINALIZED-V1`**
