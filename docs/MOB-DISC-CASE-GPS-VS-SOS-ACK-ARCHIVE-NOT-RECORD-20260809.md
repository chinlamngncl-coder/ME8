# MOB DISC — Case desk GPS gap · Archive ≠ Record · UI theme check (2026-08-09)

**Status:** Discuss lock. **No code until you MOB-APPLY.**  
**Screenshot proof:** SOS Ack opens Google Maps at real coords (e.g. `1.316711, 103.759466` Clementi). Case desk said “No GPS” — that is a **wire gap**, not “GPS never existed.”  
**`.cursorrules`:** Evidence chrome + CREDIT-LEAN.

---

## 1. GPS — you are right; Case desk was incomplete

| Path | GPS? |
|------|------|
| **SOS ledger / Ack HTML** | Yes — `sosIncidents` stores `lat`/`lon` and builds **Open location in Google Maps** (`https://www.google.com/maps?q=lat,lon`) |
| **Case desk Location box** | Only reads `case.refs.lat` / `refs.lon`. If those were empty → shows “No GPS” |

**Why empty on your case (honest):**

1. Case may have been created **before** open-desk stored lat/lon on raise/ack, **or**  
2. Raise wire ran without lat on the entry at that instant, **or**  
3. Desk **never re-reads** the SOS ledger by `refs.sosIncidentId` when you open the case  

SOS Ack still has GPS → Case desk should use the **same** source (ledger → pin/link). Showing “No GPS” while Ack opens Maps = **bug/gap**. Not cheating on purpose — **missed bind from SOS → Case**.

### What to build (discuss — your ask)

For Super admin / ops on Case desk Location:

| Option | What |
|--------|------|
| **A (recommend)** | Mini map embed (OSM iframe **or** reuse Leaflet style if we keep Evidence look) **plus** “Open in Google Maps” link (same as SOS Ack) |
| **B** | Link only (open Maps in new tab) — thinner |

**Data fix inside same APPLY:** when opening case, if `refs.sosIncidentId` and refs missing lat/lon → **load SOS incident GPS once** and show map/link (persist onto case refs so next open works offline of ledger).

**Proposed APPLY name:** `OPS-CASE-GPS-FROM-SOS-AND-MINIMAP-V1`  
(Do **before** or with note-visible — your call; GPS is the trust break.)

---

## 2. BWC remote Record when you pressed Archive — checked

### What Archive does (code)

`ops-cases-ui` → `POST /api/ops-cases/:id/archive` → `archiveCase()` writes `archivedAt` + audit `case.archive`.  
**No** `deviceControl`, **no** SIP MESSAGE, **no** `scheduleDeviceRecord`, **no** start video.

### What **does** remote Record

`deviceAlarm.raiseDeviceAlarm` → on **new SOS/fall** only:

`scheduleDeviceRecord(camId, incident.id)` — **Path B: DeviceControl Record on SOS raise** (see `deviceAlarm.js` + `sosIncidents` Path B comment).

Also possible around SOS: server pull / snapshot schedules — **not** the Archive button.

### Verdict

| Claim | Result |
|-------|--------|
| Archive button wired to Record | **Not in code** — no link |
| Record is a bug “from archive APPLY” | **No** — Record path predates Cases desk; it is SOS raise |
| You saw Record when pressing Archive | **Timing / same session as SOS case** is likely; Archive itself cannot instruct the BWC |

**If it happens again:** note exact second + whether SOS was still open + server log for `device control` / `scheduleDeviceRecord` / `case.archive`. If log shows Record with **no** alarm raise and **only** archive — then we hunt a different path. Today’s code: **Archive ≠ Record**.

---

## 3. Same UI concept / theme for Cases tab? Double-check

| Check | Pass? |
|-------|--------|
| Lives under **Evidence & Docking** hub nav | Yes |
| Uses Evidence panel / toolbar / `enterprise-card` / `btn-primary` / `btn-ghost` | Yes |
| Filter toolbar like Case Files | Mostly yes |
| Operator plain copy | Mostly |
| **Gaps (fail polish)** | Add note hard to see; Archive+Restore both showing; Location empty while SOS has GPS; OSM iframe not same as main Ops Leaflet map; media “paste file id” is lab-ish vs Library picker |

**Verdict:** Same **Evidence hub family**, not a foreign skin — but **not finished** to Case Files / SOS Ack quality. GPS + note visibility + button sync are the honesty fixes.

---

## 4. Discuss order before “note visible” APPLY

1. **`OPS-CASE-GPS-FROM-SOS-AND-MINIMAP-V1`** — pull GPS from SOS ledger; mini map + Google Maps link on Case desk (your screenshot proof).  
2. **`OPS-CASE-DESK-NOTE-VISIBLE-V1`** (+ archive/restore button sync in same or twin).  
3. Later: Library picker instead of paste-id; retention MOBs.

**No APPLY this turn.** Say the GPS APPLY when ready.

---

## One line

**SOS Ack has GPS; Case desk failed to use it — fix with minimap+Maps link from ledger. Archive does not remote-Record; SOS raise does. Cases tab is Evidence-themed but unfinished (GPS/notes/buttons).**
