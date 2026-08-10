# MOB DISC — FULL SUMMARY (no banned protocol words) · ready to MOB (2026-08-09)

**Status:** LOCKED master for next APPLYs. **No code this turn.**  
**`.cursorrules`:** UI form rules + CREDIT-LEAN-HARD.  
**Operator / product language:** **Never say “GB” / protocol OEM names** on UI, manuals face, or disc locks meant for operators. You will **design the BWC ID scheme before launch** — we use **your** field. Until then: Fleet **Device ID** (network/live) + **Serial** (sticker / dock folder). Got it.

---

## 0. Hard language lock (you ordered)

| Forbidden in product face / operator discs | Use instead |
|--------------------------------------------|-------------|
| “GB ID”, protocol slang, banned OEM names | **Device ID** (live / register — internal machine id) |
| Expect humans to type 20-digit network ids | **Serial** (asset sticker) for dock folders + inventory |
| Paste long Library / Case ids as normal UX | **Lists, search, buttons, pickers**; ids internal |

**Before launch:** you settle the official **BWC ID** design → Fleet maps it. Dock resolve / manuals follow **your** ID — not a protocol nickname.

---

## 1. What we built tonight (Cases / Evidence)

| APPLY | Done |
|-------|------|
| SOS alert audio reliable | Tone even if speak off; longer pattern |
| CREDIT-LEAN in `.cursorrules` | Hard lean block |
| `OPS-CASE-OPEN-DESK-V1` | Case desk: media + map slot + fields + notes |
| `OPS-CASE-BIND-EVIDENCE-V1` | Link Library file → play (paste = **lab only**, not sell story) |
| `OPS-CASE-ARCHIVE-HIDE-V1` | Soft archive on disk; Active vs Archived list; Super admin |

**Bugs still open (UI):** note hard to see; Archive+Restore both showing; Case map empty while SOS Ack has GPS.

---

## 2. Product logic (unified — no miss)

### A. SOS → Case → media (two clips)

1. SOS on BWC → Case opens (`SO-…`).  
2. **Path B:** software commands **device Record** on raise (log proved — not Archive).  
3. **Path A:** HQ/software may capture live if stream works.  
4. **Path C MUST:** dock → client Storage → Library indexes → **auto** link **both** clips to same SOS/Case (two files, not merge).  
5. Case JSON = **links only**; bytes on **client Storage/FTP**.

### B. Library

- **Our software index** (gives file id).  
- Files live on **client** folder they set in Evidence → Storage.  
- Humans: **picker / auto**, not memorize file id.

### C. Identity (your design owns launch)

| Human | Machine (internal) |
|-------|---------------------|
| **Serial** / asset sticker → dock folder | **Device ID** (live/SOS/register) |
| Case list → click row | Case id / SOS id / Library id in APIs |

Serial registry APPLY already landed; dock folder resolve by Serial continues under your BWC ID plan.

### D. Archive

- Hide from **Active** list; JSON stays; **Archived only** to find; Restore.  
- Does **not** delete Library video. Does **not** remote-Record.

### E. Redact / FR / ANPR / Weapon

- Licensed features on Library media / analytics.  
- No license → Redact **grey**, rest of Evidence still works.  
- Redacted exports = shelf of safe copies.

### F. Retention (later)

- Evidence hub → **Retention** (Super admin categories).  
- Delete → **7-day queue**.  
- Case membership holds purge while linked.

---

## 3. MOB queue — start here (one at a time)

| # | MOB-APPLY | Must |
|---|-----------|------|
| **1 NEXT** | `OPS-CASE-GPS-FROM-SOS-AND-MINIMAP-V1` | Pull SOS GPS onto Case; mini map + open-maps link (same as Ack) |
| **2** | `OPS-CASE-DESK-NOTE-VISIBLE-V1` | Notes visible; Archive vs Restore sync only |
| **3** | `OPS-CASE-BIND-LIBRARY-PICKER-V1` | Kill paste as primary; Add from Library |
| **4** | `OPS-CASE-DUAL-RECORD-AUTO-DOCK-MUST-V1` | Dock auto both clips on Case = PASS |
| **5** | Dock Serial → Device ID resolve (if still gap) | Follow **your** BWC ID / Serial — no protocol words in UI |
| **6** | `EVIDENCE-RETENTION-CATEGORIES-V1` | Evidence → Retention |
| **7** | `EVIDENCE-DELETE-QUEUE-7D-V1` | 7-day queue |
| **8** | `REDACT-LICENSE-GREY-BUTTON-V1` | Grey if no license |

---

## 4. Remote Record (settled from log)

SOS raise at 22:32:16 → `Record` udp_once. **Not** Archive. **Not** Case paste.

---

## 5. Manuals later

Teach: Serial sticker, dock auto, Cases by list, two clips on one Case, Storage is theirs, no long-id typing, no banned protocol words on the face.

---

## One line

**Your BWC ID before launch; Serial for humans; Device ID internal; dock auto + Case desk by click/picker; next MOB = GPS minimap on Case — say `MOB-APPLY OPS-CASE-GPS-FROM-SOS-AND-MINIMAP-V1` to start.**
