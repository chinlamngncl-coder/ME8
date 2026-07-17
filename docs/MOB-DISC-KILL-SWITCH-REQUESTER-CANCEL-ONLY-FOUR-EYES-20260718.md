# MOB DISC — Kill switch: why only Cancel? Does second operator get Approve popup?

**Date:** 2026-07-18  
**Status:** DISC — paper only — **no code**  
**Operator:** Screenshot — “Kill switch — awaiting second operator” · Reboot Chin · Requested by **global** · only **Cancel** visible. “I knew I did this logic — how do I even do a kill switch if I only have Cancel? Will the other operator / super admin get a popup to approve?”

**Search:** `four eyes`, `kill switch approve`, `awaiting second operator`, `self_approve_blocked`

---

## Short answers

| Question | Answer |
|----------|--------|
| Why only **Cancel** for you? | You are the **requester** (`global`). By design you **cannot approve your own** request |
| How does kill switch complete? | A **different** signed-in operator (with Kill switch permission) clicks **Approve** on the **same bar** |
| Popup alert to the other operator? | **No dedicated pop-up / toast to wake them.** They get the **Ops bar** (“awaiting second operator”) with **Approve** when their dashboard receives `kill-switch-pending-list` |
| Super admin same as you? | If still logged in as **same** `global` user → still **Cancel only**. Need a **second user account** (or second browser session as that other user) |

Your logic is working as designed. Screenshot = requester view.

---

## Intended four-eyes flow (your design)

```
Operator A (you / global)
  → Reboot / Shut down + reason (≥10 chars)
  → Server creates pending request (TTL 5 min)
  → Alert to A: “second operator must approve within 5 minutes”
  → Bar shows: Cancel only (isMine)

Operator B (different userId, Kill switch permission)
  → Same Ops page, same bar appears (socket broadcast)
  → Bar shows: Approve (not Cancel)
  → Confirm → command sent to BWC
  → Both get pending list cleared
```

Server hard block if B === A:

```
requesterUserId === session.userId
  → deny: “A different operator must approve this request.”
  → audit: self_approve_blocked
```

TTL: **5 minutes** (`lib/killSwitchFourEyes.js` `PENDING_TTL_MS`) then expires.

---

## What the second operator actually sees

| Channel | What |
|---------|------|
| Ops bar `#kill-switch-approve-bar` | Title “Kill switch — awaiting second operator” + device + reason + **Approve** |
| Browser `alert` on approve success | “Kill switch approved and command sent.” |
| Dedicated push / modal “please approve now”? | **No** — not implemented. They must have Ops open (or refresh) with kill-switch permission |

UI rule (`renderKillSwitchPendingList`):

```
if (requesterUsername === dashboardUsername) → Cancel only
else → Approve only
```

So: **not** “broken Cancel-only UI” — **requester vs approver** split.

---

## Lab how-to (you alone tonight)

1. Keep request pending (or re-request Chin reboot).  
2. Open a **second browser** (or private window) → login as another user who has **Kill switch** permission (Settings → Users).  
3. Open Ops on that session → bar should show **Approve**.  
4. Approve → Chin reboots.  

If you only have **`global`** and no second account → **cannot** complete four-eyes in lab until you create another user with Kill switch.

Cancel on your bar = withdraw your request (correct).

---

## Lock

- Four-eyes = **two different operators** — requester Cancel, approver Approve.  
- No silent self-approve for Super admin.  
- No code change unless you name an APPLY (e.g. stronger toast for approvers, or lab bypass) — **not** this DISC.

**One line:** You only see Cancel because you requested it; a second signed-in operator with Kill switch sees Approve on the same Ops bar — no separate popup.
