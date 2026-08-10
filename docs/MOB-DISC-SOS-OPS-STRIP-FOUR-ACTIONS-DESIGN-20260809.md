# MOB DISC — Ops SOS strip: four buttons after SOS→Case (2026-08-09)

**Status:** Design lock. **No code until named APPLY.**  
**Depends on direction:** `MOB-DISC-SOS-LOG-TO-SOS-CASE-SHIFT-20260809.md`  
**Operator:** After `SOS-CASE-ON-RAISE-V1`, what happens to the Ops SOS panel? There are **four** controls today — design each. CSV leave Ops; Super admin reports from Cases (by date / time / user).

---

## 1. Today’s four controls (Ops “SOS Log”)

| # | Button today | What it really does |
|---|--------------|---------------------|
| 1 | **Open incident files** | Opens **disk folder** `sos-incidents` on the server PC — not the Cases desk |
| 2 | **Download CSV** | `GET /api/sos-incidents/export` — ledger CSV for last N days (scope-filtered) |
| 3 | **Clear list** | Clears the **dashboard strip list** (not a full evidence wipe — strip hygiene) |
| 4 | **Reload list** | Refresh strip from ledger |

Title today: **SOS Log**. Chart + rows stay useful for live desk.

---

## 2. What is inside today’s SOS CSV (fact)

From `lib/sosIncidents.js` → `exportCsv` — columns **now**:

| Column | Meaning |
|--------|---------|
| Date | Calendar date (from alarm `at`, ISO date) |
| Time (UTC) | Time portion UTC |
| Type | `SOS` or `Fall` |
| Operator | Officer / friendly name |
| Camera ID | Device id |
| Status | `Acknowledged` or `Open` |
| Alarm time | Device/alarm time field if present |
| Note | Ack / incident note (newlines flattened) |
| Latitude | GPS if known |
| Longitude | GPS if known |
| Folder | Relative incident folder on disk |
| Snapshot | Public snapshot URL if any |

**Missing for a real case report:** Case ID (`SO-…`), who Ack’d, Ack time, HQ/Ground evidence ids, Cases status (Ack only / Has notes), notes count.  
So: keep this column set as the **legacy ledger export baseline**, but Super admin reports should move to **Cases export** with richer columns (§5).

---

## 3. Locked Ops strip after shift (think through all four)

**Ops panel role:** Live **SOS cases** strip — last days, chart, Ack, open live — **not** the report factory.  
**Keep the strip on Ops** (rename, don’t delete) — who sees what: `MOB-DISC-SOS-OPS-STRIP-KEEP-RENAME-SCOPE-20260809.md`.

| # | After shift | Decision | Why |
|---|-------------|----------|-----|
| Title | **SOS** or **SOS cases** (never “Log”) | Rename | Operator language |
| 1 | **Open case** | Selected / latest SOS row → **Evidence → Cases** detail for that `SO-` | Replaces disk-folder primary. (Optional Super-admin “Open folder on PC” buried later if IT needs it — not on the four-button face.) |
| 2 | **Download CSV** | **Remove permanently from Ops** | Agree with you — reporting is not a live-strip job |
| 3 | **Clear list** | Keep, rename **Clear strip** (or keep Clear list) | Only hides/clears the **Ops strip view** — does **not** delete Cases / ledger history. Confirm copy so nobody thinks cases vanish. |
| 4 | **Reload list** | Keep as **Refresh** | Still needed on Ops |

**Layout after CSV gone (still four slots or three):**

**Updated face (operator 2026-08-09):** **2 actions only** — Open case · Clear strip.  
**No Refresh** (auto update). Chart + meta redesign: `MOB-DISC-SOS-OPS-STRIP-UI-COMPACT-CHART-20260809.md`.

---

## 4. Where CSV / reports go (your idea — refined)

You said: put CSV onto Case Files or similar; by date, by time, split by user; Super admin churns reports.

**Recommendation (one path):** put Super admin export on **Evidence → Cases**, not Case Files.

| Desk | Role |
|------|------|
| **Evidence → Cases** | SOS / Face / Plate / Weapon **office** — correct home for SOS case reports |
| **Evidence → Case Files** | Officer **field report** narratives + linked clips — different product |

So: **Cases → Export report (CSV)** (Super admin).  
Case Files can later get its own field-report export if needed — **not** this SOS CSV move.

### Report controls (Cases export — design)

| Control | Behavior |
|---------|----------|
| Who | **Super admin** only (operators use Cases UI; no Ops CSV) |
| Date from / to | Required range (site timezone display; store UTC in file) |
| Split / group | **By user** (Ack actor / raise operator) — separate CSV files **or** one CSV sorted with User column first (prefer **one CSV**, columns include User, sorted by date→time→user — simpler than zip of many files unless you insist on one-file-per-user) |
| Type filter | SOS only · or All case types |
| Format | CSV UTF-8 with BOM (Excel-friendly), same as today |

**Default locked:** one CSV, columns include user; sorted **Date → Time → User**.  
Optional later APPLY: “Zip: one CSV per user” if Super admin asks.

---

## 5. Proposed columns for **Cases** SOS/report CSV (new)

Richer than Ops ledger CSV — this is what Super admin should get:

| Column | Source |
|--------|--------|
| Case ID | `SO-…` / `FR-…` / … |
| Family | SOS · Analytics |
| Type | SOS · Fall · Face · Plate · Weapon |
| Date | Case / alarm date (site local in label; ISO in value OK) |
| Time | Alarm / raise time |
| User (officer / operator) | Device operator name |
| Camera ID | Device |
| Status (case) | Ack only · Has notes · Amended · … |
| Acked | Yes/No |
| Acked by | Dashboard user who Ack’d |
| Acked at | Timestamp |
| Note (latest or ack note) | Plain text flattened |
| Notes count | Integer |
| Latitude | If known |
| Longitude | If known |
| HQ evidence ID | If dual-media linked |
| Ground evidence ID | If dock matchback linked |
| Ledger incident ID | Bridge to SOS incident store |
| Last touch user | Cases audit |
| Last touch at | Cases audit |

First APPLY can ship **SOS-only** export with these columns; expand to Face/Plate/Weapon in same exporter.

---

## 6. Relation to `SOS-CASE-ON-RAISE-V1`

| APPLY | Job |
|-------|-----|
| `SOS-CASE-ON-RAISE-V1` | Birth `SO-` when SOS fires; Ack updates same case. **Does not** redesign the four buttons alone. |
| `SOS-OPS-STRIP-ACTIONS-V1` (recommended next) | Rename title; Open case; **remove CSV**; Clear strip + Refresh; optional copy |
| `CASES-SUPERADMIN-REPORT-CSV-V1` | Evidence → Cases export: date range, sort date/time/user, columns §5 |

Order: **Raise** → **Strip actions** → **Cases report CSV**.

---

## 7. Clear list — safety words (lock)

| Allowed | Forbidden |
|---------|-----------|
| Clear Ops strip so the side panel is tidy | Implying “delete all SOS cases” |
| Does not remove Evidence → Cases rows | Silent wipe of ledger media |

If Clear today already only clears dashboard list — keep that; only fix **label/hint**.

---

## 8. Decision summary

1. Ops strip stays for **live SOS cases** — not reports.  
2. **Forget Download CSV on Ops permanently.**  
3. Super admin reports live on **Evidence → Cases** (by date, time, user columns / sort).  
4. Today’s CSV columns = §2; **new** report columns = §5.  
5. Four buttons → Open case · (no CSV) · Clear strip · Refresh.

**No code until you** `MOB-APPLY` a named row in §6.
