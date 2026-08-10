# MOB DISC — What is Library · who gives id · auto put both files together (2026-08-09)

**Status:** LOCKED. Plain English. **No code.**

---

## 1. Where is the Library?

| Piece | What it is |
|-------|------------|
| **Evidence Library** | **Our software UI + index** (Evidence & Docking → Evidence Library) |
| **Files on disk/FTP** | Still in the **client’s Storage folder** |
| **Id** | **Yes — our software** creates/registers an evidence **file id** when a file is ingested (dock / capture / import) |

So: Library = **Mobility Axiom’s catalog** of files that live on **their** storage. Not a second mystery drive. Not the Case JSON.

```text
Client folder (bytes)  ←── dock puts MP4 here
        ↑
   Fleet indexes it  →  Library row + file id
        ↑
   Case / SOS stores that id (link)
```

---

## 2. When BWC docks — send to Library?

**Yes (target / designed path):**

1. Dock/FTP drops file(s) into client Storage.  
2. **Our ingest** (Fleet dock watch / evidence register) sees new file.  
3. **Library** gets a new row + **id** (software does this).  
4. Operator sees it under Evidence Library.

Officer does not hand-type “send to Library” if dock path is set correctly.

---

## 3. “Automatically put both files together” (not merge)

**Together = same SOS / same Case desk**, two separate Library files.

| File | How it gets an id | How it joins the SOS/Case |
|------|-------------------|---------------------------|
| **HQ / software record** | Path A capture → registered in Library → `serverRecordingEvidenceId` | Linked on SOS raise / capture attach (**software**) |
| **Ground / BWC local** | Dock ingest → registered in Library → id | Path C **match-back** by camera + time → `deviceRecordingEvidenceId` + Case links (**software**) |

**Not** one merged MP4.  
**Yes** two videos listed on one SOS / one Case.

---

## 4. Everything auto? Done by who?

| Step | Auto? | Done by |
|------|-------|---------|
| SOS → command device Record | Yes | Fleet on SOS raise |
| HQ capture (if live works) | Yes (if Live Capture Auto on SOS on) | Fleet |
| Dock copy into Storage folder | Yes (dock/FTP as configured) | Dock station / FTP + client path |
| Register into Library + give id | Yes | **Our software (Fleet ingest)** |
| Link ground file to that SOS/Case | Yes (Path C match-back) | **Our software** — when camera/time match works |
| Operator paste file id on Case | Only if match-back missed / manual bind | Human fallback |
| Play on Case desk | After links exist | Software |

**Ideal sell story:** officer docks → both clips show on that SOS/Case **without** merging and **without** paste — **Fleet does it**.  
**Honest today:** Path A/B/C designed; Case desk still needs GPS/picker polish; if match-back fails, Super admin can still Link by id.

---

## One line

**Library = our software’s index (gives the id); files stay on client Storage; dock ingest + match-back (our software) auto-attach both HQ and ground clips to the same SOS/Case as two files.**
