# MOB DISC — Dock auto MUST · no paste-id for humans · Case/Library standards (2026-08-09)

**Status:** LOCKED product standard. **No excuses.** Paste-id is **lab leftover**, not sellable UX.  
**No code this turn** — APPLY names below when you order build.

---

## 1. Dock → both clips on SOS/Case = **MUST (fully auto)**

| Rule | Lock |
|------|------|
| After BWC docks | Fleet **must** ingest → Library id → **match-back** → attach ground clip to that SOS **and** Case |
| HQ clip (if Path A existed) | Already linked; stays on same SOS/Case |
| Officer / Super admin | **Must not** need to paste anything for the happy path |
| Merge MP4 | Still **not** required — two files, one Case |
| If match fails | Soft fail + **visible** Super admin queue (“Unmatched dock clips”) — **not** “remember the id” |

**No “ideal / fallback forever.”** Sellable path = auto. Manual link = rare repair tool only (Super admin), not the main story.

**APPLY (when ordered):** harden/finish Path C + Case dual media show — treat as **must-pass**:  
`OPS-CASE-DUAL-RECORD-AUTO-DOCK-MUST-V1`  
(Lab PASS = dock test cam → both clips appear on Case Evidence media with zero paste.)

---

## 2. You are right — nobody memorizes long ids

Paste “Link Library file” / long Case ids = **confusing and rejected** for normal Super admin / operators.

| Forbidden as main UX | Why |
|----------------------|-----|
| Remember Case id like `SO-20260809-cf396e` to type elsewhere | Easy to mistype |
| Remember Library file uuid/id chunks | Worse |
| Expect users to be “smart” about ids | Not enterprise |

Ids stay **internal** (software, APIs, logs). Humans use **names, lists, buttons**.

---

## 3. How does Super admin find the Case? (human path)

**Standard — never “know the id by heart”:**

1. Evidence → **Cases**  
2. List (Active) — columns: When, Camera, Type, Title/name, Status  
3. **Search** by camera / officer / day / SOS time  
4. **Click the row** → open Case desk  

Optional helpers (same APPLY family later):

- From SOS Ack / Ops strip → **Open case** button (already direction)  
- From Library clip → **Open linked Case** if linked  

Case id may show on the desk title for support — **display only**, not something you type daily.

---

## 4. How to get media onto the Case? (human path — no paste)

**Happy path (MUST):** dock auto → media already on Case.

**If repairing / adding extra clip (Super admin):**

```text
Open Case desk
  → button: “Add from Library”
  → picker: filter by THIS camera + day (pre-filled)
  → tick row(s) → Add
  → Play appears
```

**Never the sellable story:** “copy file id from Library detail and paste here.”

Paste-id field: **hide** for normal use, or Super admin “Advanced” only after picker ships.

**APPLY:** `OPS-CASE-BIND-LIBRARY-PICKER-V1` (replace paste as primary).

---

## 5. Design standards to follow (lock for manuals + build)

| # | Standard |
|---|----------|
| S1 | Humans pick from **lists**; software keeps **ids** |
| S2 | Dock → Library → SOS/Case link = **automatic** |
| S3 | Case desk shows **Play** for HQ + Ground when linked — no id typing |
| S4 | Search Cases by camera / time / name — not by memorizing `SO-…` |
| S5 | Library row actions: Open / Add to Case / Open Case — buttons |
| S6 | Unmatched dock clips → Super admin **queue**, not tribal knowledge |
| S7 | Manuals teach buttons and lists — **never** “paste this 40-character id” |

---

## 6. MOB order (updated)

1. `OPS-CASE-GPS-FROM-SOS-AND-MINIMAP-V1`  
2. `OPS-CASE-DESK-NOTE-VISIBLE-V1` (+ archive button sync)  
3. `OPS-CASE-BIND-LIBRARY-PICKER-V1` — kill paste as main path  
4. `OPS-CASE-DUAL-RECORD-AUTO-DOCK-MUST-V1` — dock auto both on Case = PASS or fail  

---

## One line

**Dock auto both clips onto the Case is mandatory; Super admin finds Cases by list/search/click and adds media by Library picker — never by remembering long ids.**
