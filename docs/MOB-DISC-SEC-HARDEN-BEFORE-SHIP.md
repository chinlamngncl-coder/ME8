# MOB DISC — Security four-pack: must harden before ship

**Date:** 2026-07-15 ~01:31  
**Status:** **S0 APPLIED** — see `MOB-APPLIED-SEC-EVIDENCE-UPLOAD-SAFE-NAME-V1-20260723.md`. S1–S3 APPLIED earlier. Remaining ship-adjacent: lab default creds.  
**Builds on:** `MOB-DISC-SEC-GOOGLE-FOUR-FINDINGS-PLAN.md`  
**Operator:** Before ship, we must harden this.

---

## Decision

**Customer / PH-KR / packing ship is blocked on the security harden genre** — not optional “nice to have.”

Lab / live-chase / Seeta / WVP soaks may continue. **Shipping a customer zip without these fixes = FAIL gate.**

This is **pack-time** reminder territory (same class as pre-ship checklist) — **not** a daily nag. Ordinary MOB sessions stay quiet until user says ship/pack **or** opens security APPLY.

---

## Must-harden set (before ship)

| Pri | MOB | Job |
|-----|-----|-----|
| **S0** | `mob-sec-evidence-upload-safe-name` | **APPLIED** — UUID + safe ext; no `originalname` path write (`MOB-APPLIED-SEC-EVIDENCE-UPLOAD-SAFE-NAME-V1-20260723.md`) |
| **S1** | `mob-sec-uncaught-exit` | **APPLIED** — fatal uncaught → exit(1) |
| **S2** | `mob-sec-sip-crypto-random` | **APPLIED** — SIP call-id / tag / SN → `crypto.*` |
| **S3** | `mob-sec-login-rate-lru` | **APPLIED** — cap / LRU login attempt Map |

One APPLY at a time. Order above. Prove between each.

---

## Tie to pack / pre-ship

When user says **ship / pack / customer pack / packing checklist / CREATE ship**:

1. Print normal PRE-SHIP GATE (existing checklist).  
2. **Also** check security genre: all four S0–S3 **APPLIED + PASS** (or user explicitly skips a named item in writing).  
3. Do **not** declare ready to send if S0 (upload path) is still open.

Add to operator mental model next to multer-in-deps / Node 22+ / signed license — **security four-pack**.

(Optional later: one line in `PRE-SHIP-GATE-CHECKLIST.md` when you `MOB-APPLY` a ship-desk doc update — not required to lock intent in this disc.)

---

## What is *not* blocked

| Work | OK without security genre? |
|------|----------------------------|
| Lab WVP soft-chase prove | Yes |
| Seeta / FR align after wake | Yes |
| Day-to-day MOB | Yes |
| **Customer ship zip** | **No — harden first** |

---

## When to run the genre

- Prefer a focused **security morning** (or before first customer pack).  
- Not mid-FR/WVP APPLY bundle.  
- Start: `MOB-APPLY mob-sec-evidence-upload-safe-name`

---

## One line

**Before any customer ship: APPLY and PASS S0–S3 security harden; lab work may continue, ship may not.**
