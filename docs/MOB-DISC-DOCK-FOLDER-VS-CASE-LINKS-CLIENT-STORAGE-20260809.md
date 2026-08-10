# MOB DISC — Dock → folder → Case links (client Storage/FTP) (2026-08-09)

**Status:** LOCKED plain logic. **No code.**  
**Question:** Case JSON = links only — then how does docked video “go into a folder”? Where does a paying client keep files on their own Storage/FTP?

---

## 1. Two different jobs (do not mix)

| Job | What moves | Where |
|-----|------------|--------|
| **A. Keep the video bytes** | Real MP4/files | **Client’s Storage / FTP** (path they set in Evidence → Storage / docking) |
| **B. Case / SOS ticket** | Small JSON + **links** (file ids) | App `ops-cases` / SOS ledger under Fleet storage |

**Dock does job A first.**  
**Match-back + Case does job B** (point the ticket at those files).  
JSON never holds the video. The **folder holds the video**.

---

## 2. Logic when BWC docks (automatic)

```text
1. Officer docks BWC
        ↓
2. Dock / FTP ingest copies (or receives) video into
   THE CLIENT’S configured root
   e.g. D:\AxiomEvidence\…  or  \\nas\ftp\…  or their FTP home
        ↓
3. Fleet registers the file in Evidence Library
   → gives it an evidence file id
   → knows camera / time / name
        ↓
4. Path C match-back (SOS design):
   same camera + time near SOS
   → attach deviceRecordingEvidenceId on that SOS
   → Case refs / evidenceLinks get the same id
        ↓
5. Case desk “Evidence media” Plays via that id
   (bytes still on client folder — player streams from Library)
```

**“Automatically into folder”** = step 2 (dock → **their** Storage/FTP).  
**“Automatically onto the Case”** = step 4 (link id only).  

Not: copy the whole MP4 into the Case JSON.  
Not: force every client onto our cloud.

---

## 3. Sell to client — where do **they** keep it?

| Client choice | Where videos live |
|---------------|-------------------|
| **Their local disk** | Folder they set in Storage (NAS, D:\, server disk) |
| **Their FTP** | FTP root they set for docking / evidence |
| **Our default lab path** | Only if they leave default — still **on their machine/server**, not “inside Case JSON” |

**You (vendor) sell software.**  
**They own the storage.** Install guide: “Set Evidence → Storage / Dock FTP to your agency folder.” All Library, dock, dual SOS clips land **there**. Cases only **point** at those files.

If they change Storage path later: new docks go to new path; old files stay where they were (migration = separate ops job).

---

## 4. One picture for manuals later

```text
CLIENT STORAGE / FTP          FLEET APP
(folder they own)             (ticket)
     │                            │
     │  dock puts MP4 here        │  Case JSON:
     │  Library indexes it ───────┼─► evidenceLinks: [ id-A, id-B ]
     │                            │  SOS: server + device ids
     └────────────────────────────┘
```

**Professional line for clients:**  
“Video stays in your Storage/FTP. Cases and SOS are the office folder that **links** those videos so HQ and ground clips stay together.”

---

## One line

**Dock writes video into the client’s Storage/FTP; Library gets an id; Case/SOS only store that id as a link — clients keep files on their own disk/FTP, not inside JSON.**
