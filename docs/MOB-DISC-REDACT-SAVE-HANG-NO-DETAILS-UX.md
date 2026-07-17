# MOB DISC — Redact: can’t Save · no details · stupid scroll (client-facing FAIL)

**Status:** LOCKED 2026-07-16 ~22:30  
**Search:** `can't save`, `no details`, `scroll all the way`, `redaction bottom`, `face-follow saving`  
**Operator anger (fair):** Product looks broken. Client would think the same.

---

## What you showed (facts)

| Symptom | Meaning |
|---------|---------|
| Blue bar **“Saving face-follow redacted copy…”** | Save started; **face-follow burn is stuck / too slow** — not finished |
| No reason / visible / incident fields | Those appear **only after** Save finishes (note panel). Hang = **you never get the designed details step** |
| Many Preview #1… on the right | Auto list still noisy / rail eats the screen |
| Scroll forever to “do redaction” | **Layout FAIL** — Redact action buried; client-hostile |

**Not your fault. Design + burn path FAIL.**

---

## Why Save “doesn’t work”

1. Auto sets **face-follow** mode.  
2. Save runs **full-clip per-frame burn** (can take many minutes; UI shows one line, looks dead).  
3. Until that returns, mark panel stays on “Saving…” — **Cancel** only.  
4. Designed **details** (reason, visible description, incident note) are on the **next** panel after success.  
5. So: hang Save = **no details UI**. Looks like “we never built details.”

Slim preview MOB helped list count; it did **not** fix Save hang or detail gate.

---

## Why scroll / Redact at the bottom (client shame)

Two layout problems (both real):

| Where | Problem |
|-------|---------|
| Evidence detail **right column** | **Redact video** sits too low — operator scrolls past junk to find it |
| Redact modal **right rail** | Long preview list dominates; Save/footer can feel buried when the rail/workspace scrolls |

Client will think: “amateur UI.” Fair.

---

## What we will **not** tell you

- Open lab pages  
- Become a coder  
- “Just wait longer” with no progress  

---

## Named fixes (you pick APPLY — one at a time)

| MOB | What it fixes |
|-----|----------------|
| **`mob-evidence-redact-save-progress-v1`** | Save progress / timeout / cancel; don’t freeze forever; get to details or clear error |
| **`mob-evidence-redact-details-before-or-with-save-v1`** | Details (reason / visible / note) available **without** waiting for burn to finish — match design |
| **`mob-evidence-redact-action-top-v1`** | **Redact** button near top of detail actions — no scroll hunt |
| **`mob-evidence-redact-modal-actions-sticky-v1`** | Save/Cancel always sticky visible; preview list scrolls **inside** only |

Recommended order for client face:

1. `mob-evidence-redact-action-top-v1` (find Redact)  
2. `mob-evidence-redact-modal-actions-sticky-v1` (Save always visible)  
3. `mob-evidence-redact-save-progress-v1` (Save finishes or fails clean)  
4. `mob-evidence-redact-details-before-or-with-save-v1` (details as designed)

---

## One line

**Save hang blocks details. Redact buried = client FAIL. Next = named UX MOBs above — say MOB-APPLY.**
