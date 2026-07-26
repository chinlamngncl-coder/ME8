# MOB DISC — DISC OK vs MOB-APPLY (queue, not double work)

**Date:** 2026-07-24  
**Status:** PAPER LOCK — process only · **no code**  
**Operator ask:** You keep asking me to say OK, then MOB the other. Are we recording a function for later (OK), and doing the current MOB first?

---

## Short answer

**Yes.** That is the intended workflow — not busywork.

| Phrase | Meaning | Code? |
|--------|---------|--------|
| **`… DISC OK`** / **`STACK OK`** / **`CAP 8 OK`** | You **agree the paper**. Agent **locks the plan** in a disc. Feature stays in the **queue**. | **No** |
| **`MOB-APPLY <exact name>`** | You order **build that one item now**. | **Yes** — only that MOB |

So: **OK = remember / lock design.**  
**APPLY = do it now.**

You are **not** supposed to say OK and APPLY for the same thing in one breath unless you want build immediately.

---

## Why it felt like “OK, then MOB the other”

Recent session had **many ideas at once** (User Circle, Map AR, BWC×6, VC restore). Rules force:

1. **One MOB at a time** (no bundling).  
2. **Discuss before inventing** (paper when unsure).  
3. **You own priority** — agent must not silently start Circle while you are bleeding on VC Live.

So the agent:

- Wrote **discs** for Circle / AR / BWC6 → asked **OK** to lock design.  
- When you typed **APPLY** for something else (or the urgent FAIL), it **built that**.  
- Locked-OK items stay on the **backlog** until their own APPLY.

Example of what actually happened:

| Paper lock | Built when |
|------------|------------|
| Circle overflow cap 8 (disc OK path) | You later said **`MOB-APPLY USER-CIRCLE-BATCH-OPEN-V1`** |
| AR POI stack OK | You later said **`MOB-APPLY TACTICAL-MAP-AR-POI-V1`** |
| BWC6 DISC OK (= don’t raise to 6 inside restore) | Bound into restore APPLY — **cap stays 4**; 6 still **queued** as `VC-BWC-INGRESS-CAP-6-V1` |
| VC restore disc | You said **`MOB-APPLY VC-LIVE-STAGE-RESTORE-AND-ESCAPE-V1`** |

**BWC6 DISC OK** did **not** mean “build 6 now.” It meant “I accept the disc: 6 is possible later, not in restore.”

---

## Clean rules (operator-friendly)

### When agent asks for OK

Only for **paper** decisions: stack, cap, risk pick, product face.  
After you say OK → agent updates/locks disc → **stops**. No code.

### When you want build

Say only:

`MOB-APPLY <exact name>`

Optional same message: short override (“cap 8”, “no toast”).  
Do **not** need a second OK for a MOB that was already disc-locked.

### When you want both lock + build

One line is enough:

`MOB-APPLY USER-CIRCLE-BATCH-OPEN-V1`  
(or)  
`CIRCLE CAP 8 OK — MOB-APPLY USER-CIRCLE-BATCH-OPEN-V1`

Agent builds Circle; does **not** also start AR/VC unless you named them.

### When Live is on fire

Urgent FAIL APPLY wins. Other OKs stay parked. Agent must **not** ask you to OK five discs before fixing the black screen — that was heavy; restore should have been the clear first APPLY once you were angry about VC.

---

## Queue picture (honest)

```
DISC OK  →  backlog (named MOB, ready when you APPLY)
MOB-APPLY →  build now → you PASS/FAIL → next APPLY
```

Agent should, when useful, print a **one-line backlog** of locked-but-not-built items — not a book of MOBs, and not “which do you prefer?” menus.

**Current backlog examples (illustrative — not a nag list):**

- `VC-BWC-INGRESS-CAP-6-V1` — locked by BWC6 DISC OK (after restore PASS)  
- Tactical site ImageOverlay T2 — after AR POI PASS if you want  
- User Circle / AR POI / restore — **already APPLIED** this session (await your PASS/FAIL)

---

## What agent must stop doing

- Asking **OK** when you already said **APPLY** for that same item.  
- Treating **DISC OK** as permission to code.  
- Ending every reply with “say OK then APPLY something else” when one APPLY is already clear.  
- Bundling Circle + AR + VC into one APPLY.

---

## Operator next step

No code from this disc.  

If this matches how you want to work: say **PROCESS DISC OK**.  

Then for product work: only **`MOB-APPLY …`** (or PASS/FAIL on what’s already applied).
