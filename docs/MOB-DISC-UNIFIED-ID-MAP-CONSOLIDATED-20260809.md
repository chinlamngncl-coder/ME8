# MOB DISC — UNIFIED ID MAP (tonight’s design consolidated) (2026-08-09)

**Status:** LOCKED master. Unifies BWC identity + dock + Library + Case + SOS from tonight’s discs/chats.  
**Got it:** humans do **not** live on long ids; software does. Dock auto is **must**.  
**Sources checked (same day):**  
`MOB-DISC-BWC-IDENTITY-SHIP-HINT-SERIAL-VS-GB-20260809.md`  
`MOB-DISC-DOCK-KEY-SERIAL-NOT-GB-20260809.md`  
`MOB-DISC-BWC-SERIAL-ASSET-REGISTRY-20260809.md` (APPLY done)  
`MOB-DISC-DOCK-AUTO-INGEST-KEY-MATCH-20260809.md`  
`MOB-DISC-SOS-DUAL-RECORD-DOCK-MATCHBACK-20260809.md`  
`MOB-DISC-DOCK-AUTO-MUST-NO-PASTE-ID-STANDARDS-20260809.md`  
`MOB-DISC-LIBRARY-IS-OUR-INDEX-AUTO-BOTH-CLIPS-20260809.md`  
`MOB-DISC-DOCK-FOLDER-VS-CASE-LINKS-CLIENT-STORAGE-20260809.md`

---

## 1. One picture — do not mix these “IDs”

```text
HUMAN WORLD (stickers, lists, buttons)
  serial / asset tag     →  dock FTP folder name (e.g. UB8-0042)
  officer name / title   →  display only
  Case list row          →  click to open (shows SO-… on screen)

MACHINE WORLD (software only — never “remember to paste”)
  GB deviceId (20-digit) →  SIP / live / SOS cameraId
  Library file id        →  Evidence catalog row → bytes on client Storage
  SOS incident id        →  alarm-… ledger key
  Case id (SO-/FR-/…)    →  ops-cases JSON filename / API key
```

**Rule:** Operator/Super admin uses **lists, search, Serial sticker, buttons**.  
Long GB / Library / Case / SOS ids = **internal**. May **display** for support. Must **not** be the normal way to link media.

---

## 2. What each id is for (unified)

| Id | Who sees daily | Purpose |
|----|----------------|---------|
| **Serial / asset** | Humans (sticker + Fleet **Serial** field) | Dock folder key; inventory; resolve → GB |
| **GB deviceId** | Software (+ tech if needed) | Live, SOS, PTT, WVP register |
| **Library file id** | Software | Points at one file on client Storage/FTP |
| **SOS incident id** | Software (Ops strip may show) | One alarm event; dual-record hang here |
| **Case id (`SO-…`)** | Shown on Case desk title | One ops case ticket; click from list — don’t memorize |

Tonight’s **paste Library file id into Case** = temporary lab wire → **rejected** as product standard (picker + auto dock instead).

---

## 3. End-to-end flow (one standard)

```text
1. Ship / setup (once)
   Super admin maps sticker Serial ↔ GB in Fleet
   Dock/FTP folders named by Serial (not 20-digit GB)
   Client Storage/FTP path set in Evidence → Storage

2. SOS on belt
   GB id on wire → SOS ledger + Case (SO-…) created
   Path B Record + optional HQ capture
   GPS on SOS (Case desk must show — next MOB)

3. Dock (MUST fully auto)
   Files land in client folder (by Serial)
   Fleet ingest → Library row + file id
   Match-back: Serial→GB + time → SOS + Case links
   Both HQ + ground clips on same Case — no paste

4. Investigate
   Cases list → click row (or Open case from SOS)
   Play media · notes · map · redact if licensed
   Archive = hide from Active list (disk kept)
```

---

## 4. Contradictions resolved

| Old / confusing | Unified lock |
|-----------------|--------------|
| Dock folder = 20-digit GB | **No** — Serial/asset (GB internal) |
| Case JSON holds video | **No** — links (Library ids) only |
| Paste file id to link | **Not sellable** — auto dock + Library picker |
| Memorize Case id to find case | **No** — list / search / Open case |
| Dock auto “nice to have” | **MUST** |
| Change GB on every cam at ship | **Optional** agency policy — default = Serial map |

---

## 5. APPLYs still open (identity + Cases)

| Done | Open |
|------|------|
| `BWC-SERIAL-ASSET-REGISTRY-V1` | `DOCK-KEY-RESOLVE-SERIAL-V1` (folder Serial → GB) if not fully live |
| Dock FTP watch (partial) | `OPS-CASE-DUAL-RECORD-AUTO-DOCK-MUST-V1` |
| Case desk / bind / archive | `OPS-CASE-BIND-LIBRARY-PICKER-V1` |
| | `OPS-CASE-GPS-FROM-SOS-AND-MINIMAP-V1` |
| | Note visible + archive button sync |

**Next Cases trust:** GPS minimap, then picker, then dock-auto-must PASS.

---

## 6. Manuals later (one paragraph)

“Cameras are filed by **Serial** on the sticker. Live uses the network device id inside the software. When an officer docks, videos go to your Storage and appear on the matching SOS/Case automatically. Staff open Cases from the list — they do not type long ids.”

---

## One line

**Serial = human dock key; GB/Library/Case/SOS ids = machine; dock auto links both clips to the Case; humans only click lists — tonight’s paste-id story is not the product.**
