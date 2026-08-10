# MOB DISC — Auto dock confirm + evidence pickup (no phone-call ops) (2026-08-09)

**Status:** `DOCK-FTP-AUTO-INGEST-WATCH-V1` APPLY done (2026-08-09). Continuous FTP watch + deviceId key. SOS match-back still pending.  
**Question:** When the officer docks, must they call HQ / tell us / click something — or can software auto-grab and file into Evidence + the right SOS?  
**Answer:** **Auto.** Officer only **docks the BWC**. Calling the officer for video is **not** the product. That is low-tech and we reject it.

Web check (this turn): common BWC dock/DEMS pattern = insert camera → charge + **automatic upload** → associate to officer/device → central store. Officer does not narrate the upload to dispatch.

---

## 1. Who does what (locked)

| Actor | Action |
|-------|--------|
| **Officer** | Put BWC in dock (end of shift / after incident). Charge. Leave. |
| **Dock hardware** | Detect camera → pull SD files → push to configured **FTP / NAS / dock server path** (already how most stations work) |
| **Mobility Axiom** | Watch that drop folder → **admit** into Evidence → read **keys** (device / time / officer if present) → **match SOS** if any → show on SOS / Cases |
| **HQ operator** | Does **not** phone the officer for “send video.” May open Cases / Evidence when notified that ground media arrived |

**Forbidden product story:** “Call officer and ask them to upload” as the normal path.

---

## 2. What “key log” means (auto identity)

Software does **not** need the officer to type a case number at the dock for V1.

**Keys we use (best first):**

| Key | Source | Use |
|-----|--------|-----|
| **deviceId / cameraId** | FTP path folder, filename prefix, or dock metadata / RFID assign | Match Fleet cam + SOS `cameraId` |
| **file time / record start–end** | File mtime or media created time (and metadata if dock provides) | Match SOS `at` window |
| **officer / badge** (if dock RFID / assign exists) | Dock auth event → `lastAuthOfficer` style fields | Soft confirm who wore it; still primary match = device + time |
| **SOS incident id** | Already on server from press time | Target of link — officer never types it |

**Confirm** = after ingest: Evidence row has `deviceId` + sha256 + linked `sosIncidentId` (when match hits) + audit who/when (system).

Ambiguous match (two SOS same cam same hour) → link **candidates**; prefer open SOS then nearest `at`; never invent; log for Super admin review. Still **no** phone call required.

---

## 3. How ME8 does auto pickup today vs gap

| Piece | Today | Gap |
|-------|--------|-----|
| Dock registry + FTP upload path settings | Yes | — |
| `evidenceRegistry.scanFtpRoot` admit files | Yes + **watch** (`lib/dockFtpIngestWatch.js`, ~15s poll, size-stable ×2) | — |
| Device id on dock files | Parsed from path/filename (20-digit GB id preferred) | Improve if dock vendor uses exotic folders |
| `dockSdkAdapter` | **Stub** until manufacturer SDK | V1 path = **FTP drop auto**; SDK later for bay “occupied / uploading” live lights |
| SOS dual media link | **`SOS-DOCK-MATCHBACK-V1` done** — attach `deviceRecording*` on SOS | Serial→GB resolve still planned; dual UI next |

So: hardware already “sends centrally” when docked; our job is **watch → key → Evidence → SOS**.

---

## 4. Auto pipeline (locked flow)

```text
BWC seat in dock
    → dock uploads files to central FTP root (configured once by IT)
    → Axiom watcher sees new file
    → ingest gate (type/hash) → Evidence catalog
    → extract keys (deviceId + time [+ officer if any])
    → search SOS ledger for that device near that time
    → if hit: attach as ground recording on that SOS (+ future SO- case)
    → optional toast to scoped ops: “Ground media arrived — SOS …”
```

Officer: **dock only**.  
Operator: **optional** open Cases when alerted — not “call Chin for the clip.”

---

## 5. What we do **not** expect

- Officer does not call HQ to say “I docked.”  
- Officer does not FTP by hand.  
- Operator does not chase officer for USB.  
- Notes/case office still **not** on FTP (Ops Cases rule stays).

---

## 6. Build order (dock auto + SOS)

| # | APPLY | Delivers |
|---|-------|----------|
| **1** | `SOS-DEVICE-RECORD-ON-ALARM-V1` | Remote Record on SOS (Path B) — prior disc |
| **2** | `DOCK-FTP-AUTO-INGEST-WATCH-V1` | Continuous watch FTP drop → Evidence with **deviceId key** from path/name/meta |
| **3** | `SOS-DOCK-MATCHBACK-V1` | On admit → SOS search → attach ground clip + optional ops notify |
| **4** | `SOS-DUAL-MEDIA-UI-V1` | HQ + Ground on SOS / Cases |
| later | Dock SDK live bay (when vendor API ready) | UI “bay uploading” — not required for V1 auto file path |

---

## 7. Recommendation (locked)

**Full auto on dock.** Same class as Axis / ViPRO-style “insert → auto upload → associate.”  
ME8 already has FTP Evidence admit; we harden **watch + keys + SOS match**. Phone-the-officer is **out**.

**Next APPLY when you want Path B code first:** `MOB-APPLY SOS-DEVICE-RECORD-ON-ALARM-V1`  
**Or dock watch first if you prefer media path before Record:** `MOB-APPLY DOCK-FTP-AUTO-INGEST-WATCH-V1`
