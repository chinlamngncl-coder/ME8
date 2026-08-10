# MOB DISC — Next MOB · SOS dual record · where videos live · one folder · manuals later (2026-08-09)

**Status:** LOCKED design + next queue. **No code this turn.**  
**Builds on:** `MOB-DISC-SOS-DUAL-RECORD-DOCK-MATCHBACK-20260809.md` (Path A/B/C already designed/applied in part).  
**Manuals later:** yes — professional ops manual section must cover this when packing/docs genre runs.

---

## 1. What to MOB next (Cases trust first)

| Order | MOB-APPLY | Why |
|-------|-----------|-----|
| **1 (next)** | `OPS-CASE-GPS-FROM-SOS-AND-MINIMAP-V1` | SOS Ack already has GPS; Case desk must show mini map + Maps link |
| **2** | `OPS-CASE-DESK-NOTE-VISIBLE-V1` (+ archive/restore button sync) | Notes / button mess from screenshot |
| **3** | `OPS-CASE-BIND-LIBRARY-PICKER-V1` | Stop paste-id; browse Library |
| **4** | `OPS-CASE-DUAL-RECORD-ON-DESK-V1` | Auto-show / auto-link **both** SOS recordings on Case Evidence media (server + device) when ids exist |
| **5** | Retention categories → 7-day queue (earlier map) | After desk usable |

Bind + Archive desk APPLYs already done. GPS is the trust break.

---

## 2. Your design — correct?

| Design point | Correct? | Fact |
|--------------|----------|------|
| SOS pressed on BWC → also **Record** | **Yes** | Path B: DeviceControl `Record` on **new SOS raise** (log proved it). Not Archive. |
| Online/HQ may also capture | **Yes** | Path A: server/HQ live capture when available → `serverRecording*` |
| When BWC **docks** → link **both** files to same SOS | **Yes** | Path C: dock match-back → `deviceRecordingEvidenceId` (+ server id when Path A worked) |
| Both belong in **Evidence media** / Case | **Yes** | They can differ (5G drop, HQ short, ground full) — investigators need **both** |
| Same idea on **Redact** (investigate) | **Yes** | Redact works on Library/export media **if Redaction license ON**; both clips are normal evidence files once in Library |
| **FR / ANPR / Weapon** if paid | **Yes** | Those licenses gate analytics features; evidence clips still live in Library. Case desk + redact use **media**, not “FR license = dual SOS record.” Dual SOS record is **SOS Path A/B/C**, not FR-paid. |

**Short:** Dual SOS record + dock link = **core SOS evidence design**. Redact / FR / etc. = **licensed tools on top of** those files once they are in Library.

---

## 3. Where is each video recorded / stored?

| Clip | How it is made | Where bytes live |
|------|----------------|------------------|
| **Ground / device** | BWC local record (SOS Path B +/or camera SOS auto-record) | On **camera** until **dock** → then ingest into **Evidence Library** on the path from Evidence → **Storage** (your FTP / disk root) |
| **HQ / software (server)** | Path A live capture while HQ has stream | Written under Fleet **storage** / evidence registry (same Library family — **not** “only FTP magic”). Exact subfolder = evidence ingest layout under configured storage root |
| **Case JSON** | Links only (`serverRecordingEvidenceId`, `deviceRecordingEvidenceId`, `evidenceLinks`) | `storage/ops-cases/…` |
| **SOS ledger folder** | Incident pack + local copies when linked | `storage/sos-incidents/…` (server/device local file names when attached) |

**FTP:** if you pointed Storage/dock at FTP, docked files land there and Library indexes them.  
**Local disk:** if Storage is a local folder, same.  
**Software record** does **not** replace ground file; it is a **second** asset.

---

## 4. “Combine both into 1 folder automatically?”

**Product meaning (correct):**

```text
ONE SOS / ONE Case
  ├── link → Library file A (HQ/server)
  ├── link → Library file B (device/dock)
  └── same SOS id / case id (not one mashed MP4 unless you export later)
```

| Approach | Use |
|----------|-----|
| **Logical folder (recommend)** | One Case / one SOS incident = **one desk** with both media linked. Library keeps separate files (integrity + chain). **This is “one folder” for the officer.** |
| **Physical subfolder** | Optional later: `…/cases/SO-…/media/` copies or hardlinks — only if Storage policy requires; not required for v1 if Case + Library links work |
| **Merge into 1 MP4** | **Not** default — different clocks/gaps; optional export tool later, not auto on dock |

**Auto today / target:** Path C dock match-back + Case `evidenceLinks` / refs ids → Case desk **Evidence media** lists Play for both. APPLY `OPS-CASE-DUAL-RECORD-ON-DESK-V1` makes that obvious without paste.

---

## 5. Manuals later (professional)

When writing Mobility Axiom manuals, include a section:

1. SOS press → HQ may record + device Record commanded  
2. Why two files (RF / 5G / HQ cut short)  
3. Dock → both appear under same SOS / Case  
4. Where to find them (Library + Case desk + SOS pack)  
5. Redact / share only with license; originals kept  
6. Archive Case ≠ delete video  

Do **not** write the full manual this turn — lock content here for the docs genre.

---

## One line

**Next MOB = Case GPS minimap. Dual record on SOS + dock link both into Case/Library is correct; HQ file on storage/Library, device file after dock; “one folder” = one Case with two links, not one mashed video.**
