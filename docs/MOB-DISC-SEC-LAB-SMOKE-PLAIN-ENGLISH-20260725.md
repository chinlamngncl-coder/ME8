# MOB DISC — SEC lab smoke: plain English only (operator is not tech)

**Date:** 2026-07-25  
**Status:** DISC — **LOCKED**  
**Applies to:** Phase 1 SEC tasks (and any later “server-only” SEC MOB)

---

## Hard rule for the agent

When writing **operator smoke**, use **what the operator sees and clicks**.

**Forbidden** in smoke steps (unless the user asked for engineer language):

- “messaging still listens”
- “listener comes up”
- “msgWss / reassembler / prune / TTL / verify script”
- “Fleet process / port 6000 / no crash on bind”
- Any phrase only an engineer would understand

**Allowed:**

- Restart Fleet (or Lab Console Start — whatever they already use)
- Open dashboard, hard refresh once if needed
- Open a BWC / see video / press SOS / open a button they already know

---

## What SEC 1.4 actually needs from you

Task **1.4** only changes **hidden server memory cleanup**. It does **not** change video, pins, or SOS UI.

**Your PASS check (plain):**

1. **Restart** the lab the way you always do.  
2. Open the dashboard.  
3. Open a BWC — **if you get video like before → PASS.**

That is enough. You do **not** need to “test messaging.” You do **not** need to drop a mid-message chunk. You do **not** need to read logs.

If restart fails or video is broken vs before → **FAIL**.

---

## Same idea for other “server-only” SEC tasks

| Task | Operator check (plain) |
|------|-------------------------|
| 1.1 timing token | Companion / BWC open still works as before |
| 1.2 Explorer open | Server folder opens Explorer (you already know that button) |
| 1.3 free disk | Restart + desk still works — **no docking** |
| 1.4 reassembler TTL | **Restart + BWC video still works** |
| 1.5 msgWss HMAC | Restart → open BWC → **video OK = PASS** (chat token is engineer/env; not desk) |

Engineer proof = agent’s `npm run verify:…`. Operator proof = **screen still works**.

---

## Agent must DO after this Disc

- Rewrite any SEC smoke that still says “messaging listens” into **Restart → open BWC → video OK = PASS**.  
- Prefer one short smoke block. No essay.

Until APPLY for wording fixes — Disc only (this file). APPLIED 1.4 smoke text should be updated to match (doc edit OK as part of locking this Disc for the open task).
