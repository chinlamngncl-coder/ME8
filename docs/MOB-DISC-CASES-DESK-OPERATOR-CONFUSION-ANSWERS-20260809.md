# MOB DISC — Operator confusion after Cases desk (BWC record · media · GPS · archive · UI) (2026-08-09)

**Status:** LOCKED answers. **No code this turn.** Screenshot = open Case desk after archive/unarchive test.  
**`.cursorrules`:** UI + CREDIT-LEAN. Fix UI only after named APPLY.

---

## 1. Did Archive / Bind / Open-desk remote-start BWC video?

**No.** Those APPLYs do **not** call DeviceControl Record / SIP shutter.

| APPLY | Files touched | Remote record? |
|-------|----------------|----------------|
| `OPS-CASE-OPEN-DESK-V1` | Cases HTML/CSS/JS, SOS lat/lon on case refs | **No** |
| `OPS-CASE-BIND-EVIDENCE-V1` | `opsCaseStore` links, preview play, link API | **No** |
| `OPS-CASE-ARCHIVE-HIDE-V1` | `archivedAt` on JSON, list filter, archive APIs | **No** |

**If the BWC suddenly recorded:** that is the **existing SOS raise path** (alarm → optional server pull + **device Record** when SOS fires) — already in `deviceAlarm` / SOS wire **before** these Cases desk APPLYs. Your case is type **sos**, SOS id `alarm-…` — matches an SOS incident, not “Archive pressed Record.”

**We did not invent a new remote-activation in archive/bind.**

---

## 2. Evidence media box — where do I upload? With / without redaction?

**This box is not an upload form.**

| Action | Where |
|--------|--------|
| **Upload / dock video** | Docking Stations + **Evidence Library** (files land on **your Storage/FTP** path) |
| **Link into this Case** | Paste **Library file id** → Link (bind). JSON only stores the **link** |
| **Redact** | Evidence Library / Docking **Redact** (license). Original stays. Safe copy → **Redacted exports** |
| **Play on Case** | Linked Library id (or SOS record id when promoted). Empty = nothing linked yet |

```text
Library (original)     ← dock / upload / storage you set
        │
        ├─ link into Case desk (evidenceLinks)
        │
        └─ Redact (if licensed) → Redacted exports (safe copy shelf)
```

**With redaction:** originals still in Library; safe copies in Redacted Exports; Case can link either (bind today = Library file id).  
**Without redaction:** use Library originals only; Redact grey when that APPLY lands.

**Location on disk:** agency Storage/FTP for media; case ticket JSON under app `storage/ops-cases/…` (links + notes + `archivedAt`).

---

## 3. “Location? No GPS?” — meaning what?

Means: this case JSON has **no lat/lon** in refs (device did not send GPS on that SOS, or it was never stored).  
**Not** “archive failed.” **Not** “map broken forever.”  
When SOS includes GPS, map pin can show (open-desk already reads `refs.lat` / `refs.lon`).

---

## 4. Is this screen “the archive”?

**No.** This screen is **Open Case desk** (one case).

| Thing | What it is |
|-------|------------|
| **Open case** | Detail for one Case ID (e.g. `SO-20260809-cf396e`) — that **is** the exact name |
| **Archive** | Soft flag on that JSON → drops off **Active** list |
| **List filter “Archived only”** | Where Super admin **sees** archived cases again |
| **Restore** | Clears flag → back on Active |

**Title on desk = Case ID · Rev · status** (e.g. `SO-20260809-cf396e · Rev 7 · Amended`). That is the exact name.

---

## 5. Archive — goes off list? Can’t edit? Super admin can’t see? Where are files? Point?

| Fear | Fact |
|------|------|
| Off Active list | **Yes — by design** (tidy desk) |
| Super admin can’t see | **Wrong** — set List → **Archived only** or **All**, open row, **Restore** or edit |
| Where are archive files? | **Same** `ops-cases/….json` on disk with `"archivedAt": "…"` — **not** moved to a secret folder, **not** deleted |
| Point of hiding | Active list stays workable; history kept; restore anytime |
| Can’t edit when archived? | You can still **open** archived case from Archived-only list; notes/edit rules unchanged. If that feels wrong → later APPLY “allow edit only when Active” |
| Library video | Untouched by archive |

**Screenshot shows both Archive + Restore** after `case.unarchive` — Restore should be **hidden** when not archived. That is a **UI sync bug** to fix on a named APPLY (not intentional “cheat”).

---

## 6. Add note not visible

Real layout problem: note textarea/button buried / hard to see under the desk (your screenshot). **Not intentional.** Fix only after:

`MOB-APPLY OPS-CASE-DESK-NOTE-VISIBLE-V1`  
(and optionally `OPS-CASE-ARCHIVE-BUTTONS-SYNC-V1` for Archive vs Restore mutual exclusivity)

---

## 7. Credit / “cheater”

Paper + named APPLYs only for product. This turn = **Mob disc answers**. No silent extra product edits.

---

## One line

**Archive/bind did not remote-record the BWC; media = Library/FTP + optional Redacted exports; Case desk links them; no GPS = none on that SOS; archive = hide from Active, still on disk + Archived-only list; Case ID is the name; note visibility + dual archive buttons = UI bugs to APPLY next.**
