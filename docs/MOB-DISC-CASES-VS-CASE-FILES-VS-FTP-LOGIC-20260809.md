# MOB DISC — What Cases are for (vs Case Files vs FTP) (2026-08-09)

**Status:** LOCKED design. No code. Operator asked: local JSON = waste? Must every case go Case Files → FTP? Where is the arrange?

**Also:** `.cursorrules` today = **UI form/grid only**. Credit-lean is **not** in that file yet — it lives in `.cursor/rules/me8-credit-lean-hard.mdc`. Paste into User Rules yourself, or later `MOB-APPLY CREDIT-LEAN-IN-CURSORRULES-V1` to add one hard block to `.cursorrules`.

---

## Plain English — three different jobs

| Lane | Job | What it stores | Where on PC | Who sets path |
|------|-----|----------------|-------------|---------------|
| **1. Cases** (Evidence → Cases) | **Ops desk for alerts** — SOS / Face / Plate / Weapon hit → Open → Ack only → notes / audit | Small **JSON** (who, when, status, notes) — **not** the video file | App **storage** → `ops-cases/…` (local next to Fleet data) | Follows app storage root today — **not** your FTP folder |
| **2. Case Files** | **Field report** an officer writes (narrative / report form) | Report records | Case Files store (local under storage) | Same family as site storage |
| **3. FTP / Evidence Library** | **Camera media** — dock upload, clips, snapshots | Video / photos | **Path you set** in Evidence → Storage / docking | **You** arrange this |

They sit **side by side**. They are **not** a forced pipeline:

```text
WRONG (not how it works today):
  Cases → must open Case Files → then copy to FTP

RIGHT (today):
  Alert rings ──► Cases (desk: Open / Ack / notes)     [JSON, local]
  Officer writes report ──► Case Files                 [report, local]
  Camera docks / uploads ──► FTP / Library             [media, YOUR path]
```

---

## So what is Cases for? (not eyeball waste)

Cases = **the working ticket for an alert**, same idea as a dispatch ticket:

1. Something happened (SOS, weapon, plate, face).  
2. Desk sees it, **Acks** it, adds a short note if needed.  
3. Later you can search “what happened on this BWC that day.”  
4. It is **not** meant to be the place you store the long video. Video already goes (or will go) to **Library / FTP** when the camera uploads.

Without Cases you only have a toast and then nothing to open later. That is the job.

**Not:** dump every alert into Case Files.  
**Not:** push every Cases JSON onto FTP.  
**Optional later (not built):** “Attach this case to a Case File” or “export case pack to folder X” — only if you name an APPLY.

---

## Must every case go to Case Files before FTP?

**No.** Three answers locked:

1. **Cases → Case Files:** not required. Case Files = when someone **writes a report**. Most alerts may stay Cases-only (Ack + note).  
2. **Cases → FTP:** not required. FTP is for **media**, not for the ops ticket JSON.  
3. **Archive clutter:** hide/archive from Cases list later (`OPS-CASE-ARCHIVE-HIDE-V1`) — still on disk, still not FTP.

---

## Where do “files” live — can I pick the folder?

| Kind | Arrange yourself today? |
|------|-------------------------|
| Dock / FTP / evidence media | **Yes** — Evidence → Storage (path you chose) |
| Cases JSON | **No separate picker yet** — under app storage / `ops-cases` |
| Case Files | Same storage family — not your FTP root unless you pointed storage there |

If you want **Cases folder = a path you choose** (even a share next to FTP), that is a **later Settings APPLY**, not today’s behavior.

---

## One sentence lock

**Cases = alert office ticket (local JSON). Case Files = written report. FTP = camera video/photos you pointed at. Not one funnel.**

---

## Related

- Archive/hide UI: `MOB-DISC-OPS-CASES-WHERE-KEPT-AND-ARCHIVE-UI-20260809.md`  
- Desk chrome: `MOB-DISC-OPS-CASE-UI-UNIFY-EVIDENCE-DESK-20260809.md`  
- Lean in rules: `MOB-DISC-CREDIT-LEAN-IN-CURSORRULES-20260809.md`
