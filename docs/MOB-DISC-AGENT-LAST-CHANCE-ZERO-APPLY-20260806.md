# MOB DISC — Last chance: zero APPLY = zero action (2026-08-06)

**Status:** paper lock. Read this **before** any edit / commit / push.  
**Audience:** every agent that replaces the previous one on ME8 / Mobility Axiom.

Operator was clear: **rules were broken.** This is the last warning.

---

## What the last agent did wrong

User said **Mob disc** + asked what was left to commit/push (summary).

Agent treated that as permission and **committed + pushed** (`ae70193` on `backup/20260722-tested-genres`), and also edited **`.gitignore`** with no APPLY.

That broke:

- `.cursor/rules/me8-zero-change-without-apply.mdc`
- `.cursor/rules/me8-rules-life-and-death.mdc`
- `.cursor/rules/me8-no-silent-change.mdc`
- Locked git rule in `docs/MOB-DISC-LAB-GIT-PUSH-BATCHES-DETAILS-20260731.md`:
  - **Mob disc ≠ push**
  - Push only after **`MOB-APPLY lab-git-push-<genre>`**

“Commit push” inside a **Mob disc** turn is **discussion**, not APPLY.

---

## Standing order (all agents)

1. **Open and obey `.cursor/rules/` first.** Always-on files win over “being helpful.”
2. **No file edit** (not one line) unless user typed **`MOB-APPLY <exact name>`** or **go ahead / apply** for **that exact item**.
3. **Mob disc** = talk + optional paper `docs/MOB-DISC-*.md` only.  
   No product code. No `.gitignore`. No commit. No push. No “I will just do it.”
4. **Git commit / push** only after a named APPLY, e.g.  
   `MOB-APPLY lab-git-push-analytics-fr-anpr-weapon`  
   Same rule as Jul 31 disc. Do not invent a push.
5. **No extras.** No drive-by gitignore, no “small obvious” fix, no scan of the whole repo unless asked.
6. **One MOB at a time.** Discuss → APPLY → only that → stop.
7. Brand stays **Mobility Axiom**. No silent rename.
8. No ship / SOS / TOTP nag unless user is packing.

Order is always:

**talk / Mob disc → user MOB-APPLY → change only that → stop.**

Queue text the agent wrote is **not** approval.

---

## Already on GitHub (do not undo unless user APPLYs revert)

- Branch: `backup/20260722-tested-genres`
- Tip: `ae70193` `lab-analytics-fr-anpr-weapon-genre: …`
- That push **already happened**. Do **not** revert / force-push unless user says **`MOB-APPLY`** for revert.

Left local on purpose (still not APPLY’d): license, CN pack scripts, `eng.traineddata`, baseline `.cursor` copies.

---

## What operator does next (no agent action)

- Tonight: nothing.
- Tomorrow: Weapon video test when operator is ready.  
  Agent waits. No reminder storm. No code until **`MOB-APPLY …`**.

---

## If unsure

**Do not edit. Ask / disc. Wait.**
