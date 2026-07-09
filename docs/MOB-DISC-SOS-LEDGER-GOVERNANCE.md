# MOB DISC — SOS ledger clear, retention, download, audit

**Status:** DISC only — clarifies **today** vs **target** for tender / enterprise.  
**Related:** `mob-me8-sos-ledger-dispatch-scope` (applied), PNP domain **B** (auth/audit).  
**Search:** `SOS clear`, `ledger governance`, `super admin clear`, `audit`

---

## Your question (plain English)

> If super admin clears the SOS list, is the data still kept?  
> Only super admin can download and edit?  
> Is it recorded what super admin did?

**Short answer today:**

| Question | Today | Target (tender / enterprise) |
|----------|-------|------------------------------|
| Data kept after clear? | **Yes — folders on disk stay**; dashboard index (`ledger.json`) is wiped | Same + optional archive snapshot before clear |
| Only super admin download / edit? | **No** — any logged-in operator can clear list and download CSV | Super-admin (or explicit permission) for **clear + CSV**; operators **view + acknowledge** in scope |
| Recorded in audit trail? | **Clear and CSV export — no.** Acknowledge — **yes** | Every clear, export, and privileged view logged with username |

---

## What “Clear list” does today

```417:420:C:\Users\user\Desktop\Enterprise Mobility\ME8\lib\sosIncidents.js
function clearDashboardList() {
    writeStore({ entries: [] });
    clearActiveAlarm();
    return { cleared: true };
}
```

| Kept | Removed from dashboard |
|------|------------------------|
| `storage/sos-incidents/YYYY-MM-DD/…/incident.html` | Rows in sidebar SOS log |
| `incident.txt`, `snapshot.jpg`, server recording copy | `ledger.json` index entries |
| Linked evidence files (catalog) | Active alarm pointer |

**Open incident files** (sidebar button) still opens the on-disk folder — incidents are **not deleted**.

UI hint already says older incidents live in the folder (`sos.ledger.olderInFolder`).

**Gap:** After clear, the dashboard cannot click old rows until ledger is rebuilt from disk (no rebuild MOB yet). Folders remain browsable on the server PC.

---

## Who can do what today

| Action | Who today | Audit trail today |
|--------|-----------|-------------------|
| View SOS list (scoped) | Any logged-in user; rows filtered by dispatch group | No |
| View full report (detail) | Any user; optional `FM_SOS_LEDGER_PIN` on detail dialog | No |
| **Clear list** | **Any logged-in user** — no role check on API | **No** — only server log line |
| **Download CSV** | **Any logged-in user** (scoped rows) | **No** |
| Acknowledge SOS + note | Any user in dispatch scope | **Yes** — `sos.acknowledge` |
| Open incident folder | Scoped user | No |
| PTT team / response | Scoped user | **Yes** — `sos.ptt_team` |

**Evidence Hub** (separate from SOS sidebar):

| Action | Who today | Audit |
|--------|-----------|-------|
| View catalog | `evidenceView` permission or super-admin | Preview logged |
| Download | `evidenceDownload` or super-admin | **Yes** — `evidence.download_*` |
| Export / trim | `evidenceExport` or super-admin | **Yes** — `evidence.export_stream` |
| Edit notes / link SOS | `evidenceEdit` or super-admin | Meta update logged |

Super-admin always has all evidence permissions. Operators get download/edit only if granted in **Settings → Users**.

---

## Target behaviour (enterprise + PNP S4-6)

Matches your intent and tender **operation log / chain of custody**:

### Rule 1 — Clear = hide dashboard index, never destroy evidence

- Clear empties **sidebar list only** (same as today).
- **Never** delete `storage/sos-incidents/**` folders or evidence catalog links.
- Before clear: write `ledger-archive/<timestamp>.json` (username, count, entry ids) — recoverable index.

### Rule 2 — Privilege

| Action | Role |
|--------|------|
| View SOS list + ack during alarm | Operator in dispatch scope |
| Download SOS CSV | **Super-admin** (or new permission `sosLedgerExport`) |
| Clear SOS list | **Super-admin only** |
| Edit evidence metadata / export | Super-admin or operator with evidence permission (unchanged) |

### Rule 3 — Audit (who did what)

| Event | Audit action id | Fields |
|-------|-----------------|--------|
| Clear list | `sos.ledger.clear` | username, entries cleared, archive path |
| CSV export | `sos.ledger.export` | username, days window, row count |
| Open incident folder (API) | `sos.ledger.open_folder` | username, incident id, camera id |
| Acknowledge | `sos.acknowledge` | already exists |

Audit trail UI + CSV export (domain **B**) — investigator sees: *“SuperAdmin cleared SOS dashboard list — 12 entries — archive saved.”*

### Rule 4 — UI (same ops theme)

- Hide **Clear list** and **Download CSV** for non–super-admin (sidebar SOS box).
- Confirm dialog: *“Clears the dashboard list only. Incident folders on disk are kept. Archived to server.”*
- Super-admin only — no new screen; same `btn-ghost` row as today.

---

## MOB genre (when you approve)

**`mob-me8-sos-ledger-governance`** — risk **2** (API + UI hide; no live video).

| File | Change |
|------|--------|
| `server.js` | `requireSuperAdmin` on clear; audit on clear + export; archive before clear |
| `lib/sosIncidents.js` | `archiveAndClearDashboardList(actor)` |
| `lib/dashboardAuth.js` | optional `canSosLedgerExport` permission |
| `public/index.html` | Hide buttons by role; confirm copy |
| `public/locales/en.json` | Confirm + audit labels |

**Does not touch:** wall, PTT, SIP, `video-wall.js`.

Fits PNP wave **5** (`pnp-auth-audit-ship`) or can run early as small governance MOB before live POC waves.

---

## Answer to your three points

1. **Kept after clear?** — **Yes**, incident files on disk stay. Only the dashboard index is cleared. *(Archive snapshot is proposed, not built yet.)*

2. **Only super admin download / edit?** — **Not yet.** Today any operator can clear and CSV-export. Evidence download/edit uses the permission grid (super-admin always; operators if allowed). **MOB above aligns SOS clear/CSV with super-admin + audit.**

3. **Recorded what super admin did?** — **Acknowledge yes; clear and CSV no today.** **MOB adds audit lines** for clear and export so the trail shows exactly who cleared or exported.

---

Reply **`MOB-APPLY mob-me8-sos-ledger-governance`** when you want this built (one MOB, low risk).
