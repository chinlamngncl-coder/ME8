# MOB DISC — Centre Summary is not a ghost tab

**Status:** DISC — answers “nothing now, nothing later?”  
**Related fix:** `mob-centre-summary-global-ref-fix` (APPLIED 2026-07-09)

---

## Short answer

**No — not a ghost tab.** Centre Summary is a **real supervisor dashboard**. You saw **nothing useful** because a **one-line JavaScript bug** crashed **after** the API had already returned data and painted KPIs — then the error handler **hid everything** and showed `global is not defined`.

After the fix, the same tab shows the **full board**.

---

## What Centre Summary is for

| Role | Industry equivalent |
|------|---------------------|
| **Supervisor / super admin** status board | Genetec dashboard, Milestone status views, Avigilon health |
| **Display 4** in control room layout | “Status board” pop-out (same page, separate window) |
| **Settings → Faults** shortcut | Deep link when tab is visible |

**Not for:** everyday operators on a station desk — they stay on **Operations**.

---

## What loads when it works

From `GET /api/command-centre/summary` (super admin only):

| Block | Content |
|-------|---------|
| **KPI row** | Devices online/offline, open SOS, SOS week/month, storage total, server uptime |
| **SOS trend chart** | Daily / weekly / monthly / yearly bars |
| **AI assistant panel** | Optional local LLM Q&A (lab) |
| **Rings** | Fleet online %, storage used % |
| **System health** | Service tiles (SIP, pool, FTP, etc.) |
| **Storage breakdown** | Table by area |
| **Recent activity** | Audit-style last actions |

That is a **full page** — not an empty placeholder.

---

## Why you saw “nothing” (before fix)

```
1. Open Centre Summary tab
2. fetch /api/command-centre/summary  → OK
3. renderStats, charts, tables        → painted
4. global.TabLifecycle.markLoaded()   → ReferenceError (global undefined in browser)
5. catch → showError(err.message)     → red banner, content hidden
```

So it **looked** like an empty broken tab. The data **was there for one frame** then wiped by the catch block.

**Not related to:** username `global`, license, or “we never built the feature”.

---

## Who sees the tab

| User | Top nav **Centre Summary** |
|------|----------------------------|
| **Super admin** (`canManageServer`) | Tab **shown** after session load |
| Station operator | Tab **hidden** — by design |

Operators use **Operations**. Supervisors use **Centre Summary** or **Display 4 → Open status board**.

---

## After MOB-APPLY

1. **Ctrl+F5**
2. Sign in as super admin (`global` or your super admin account)
3. Click **Centre Summary**

**Expect:** KPI cards, SOS chart, health tiles, activity table — **no** red `global is not defined` banner.

If API fails (server down): plain **“Failed to load summary.”** — not developer text.

---

## Not in scope of this MOB

| Item | Note |
|------|------|
| Rename tab to “Status board” | Separate `mob-vms-tabs-mixed-d` DISC |
| Show tab to non–super-admin | Product decision — currently locked to super admin |
| LLM panel content | Lab optional; panel shows “checking” if model off |

---

## Verdict

| Question | Answer |
|----------|--------|
| Ghost tab? | **No** — real dashboard, bug hid it |
| Nothing later? | **No** — fix unlocks existing UI + API |
| Remove tab? | **No** — needed for control room Display 4 and supervisor oversight |
