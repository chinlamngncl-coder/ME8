# MOB DISC — Kill switch bar: same place for requester and approver

**Date:** 2026-07-18  
**Status:** DISC — paper only — **no code**  
**Ask:** No separate pop-up — they see the Ops “awaiting second operator” bar **where**? Same as the Ops banner the requester sees, but with **Approve** instead of **Cancel**?

**Related:** `MOB-DISC-KILL-SWITCH-REQUESTER-CANCEL-ONLY-FOUR-EYES-20260718.md`

---

## Short answer

**Yes.**

| Who | Where | Button |
|-----|--------|--------|
| Requester (you / `global`) | Same Ops bar `#kill-switch-approve-bar` | **Cancel** only |
| Second operator (different user, Kill switch permission) | **Same** bar, **same** title | **Approve** only |

Same strip. Same title: **“Kill switch — awaiting second operator.”**  
Not a different page. Not a modal. Not the SOS banner.

---

## Where on Ops (layout)

On the Operations map column, **above the video wall**, under the map / geofence toolbar area:

```
#kill-switch-approve-bar
  head: Kill switch — awaiting second operator
  #kill-switch-approve-list  ← one row per pending request
```

Both operators who are signed into Ops and have Kill switch permission receive the same socket update (`kill-switch-pending-list`). The bar un-hides for both. Only the **button** differs:

```
isMine (requesterUsername === my username) → Cancel
else                                      → Approve
```

---

## Not the SOS banner

| UI | Role |
|----|------|
| `#sos-banner` | SOS / fall alarm strip under tabs |
| `#kill-switch-approve-bar` | Four-eyes reboot / shut down pending |

Different elements. Kill switch does **not** use the SOS banner.

---

## One line

**Same Ops kill-switch bar for both; requester gets Cancel, approver gets Approve — no separate pop-up.**
