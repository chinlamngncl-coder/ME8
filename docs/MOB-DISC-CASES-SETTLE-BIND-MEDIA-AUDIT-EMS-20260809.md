# MOB DISC — How Cases settle · notes+video together · not “JSON then gone” (2026-08-09)

**Status:** Design lock / gap honest. **No code.** Operator: “settle case how? case + video together? enterprise EMS? refresh wipe? where is log?”

---

## 1. What you are right about

In **real evidence / case management** (police RMS, Axon Evidence-class desks, court packs):

| Piece | Job |
|-------|-----|
| **Case / incident record** | The **folder** — ID, time, unit, status, who Ack’d, notes, disposition |
| **Evidence media** | Video / photo / audio **linked into that folder** |
| **Audit log** | Who opened, Ack’d, edited, exported, archived — **append-only**, not wiped by browser refresh |
| **Settle / close** | Explicit end state (e.g. Closed / Archived) + optional export pack |

**Ticket text alone with no link to media is incomplete for a finished case.**  
**Media alone with no ticket is incomplete for ops accountability.**

So yes: at a **certain stage**, case input and video **must be able to live under one case**. Today ME8 has the **ticket lane** started; the **join-to-media + settle** stage is **not finished product**. That is the gap — not “JSON forever and hope.”

---

## 2. What ME8 has today (honest)

| Lane | Today | Survives browser refresh? |
|------|--------|---------------------------|
| **Cases** (Evidence → Cases) | Alert ticket: Open / Ack only, notes, small fields → **JSON under app storage `ops-cases/`** | **Yes on disk** if storage write worked. Refresh reloads from files — **not** “meant” to wipe. If UI empties after refresh → **bug or wrong storage path / server not writing**, not the design goal. |
| **Case Files** | Written field report | Separate list — not auto every alert |
| **FTP / Library** | Camera clips / dock upload — path **you** set | Media on that path |
| **Ops SOS strip** | Live ops panel | Clear strip ≠ delete Cases JSON |
| **Full EMS “one case folder = notes + video + audit + close”** | **Not complete** | — |
| **Enterprise audit log UI** (who did what, forever) | **Thin / missing as a proper log desk** | Partial data may sit inside case JSON notes/history fields — **not** a first-class Log system yet |

**Settle today:** basically **Ack** (+ notes). There is **no** full “Close case + attach clip + export pack” workflow locked in UI yet.

---

## 3. Total logic we should lock (target — like big EMS, ME8-sized)

Not three random piles forever. **One case spine**, three attachments:

```text
CASE (spine — durable record)
  ├── meta: id, type (SOS/FR/ANPR/Weapon), BWC, times, status
  ├── desk: Open → Ack → … → Closed / Archived
  ├── notes / disposition (who, when)
  ├── audit events (append-only log lines)
  └── evidence links → Library / FTP file IDs or paths (video/photo)
```

| Stage | What happens |
|-------|----------------|
| **A — Raise** | Alert creates Case (Open). Tone / Ops strip. |
| **B — Desk** | Operator Acks, short note. Still may have **no** video yet (live may be gone; dock later). |
| **C — Bind media** | When clip lands in Library/FTP (dock / snapshot / export), **link** it to the Case. **This is the “put together” stage.** |
| **D — Settle** | Super admin / supervisor: **Close** or **Archive**. List can hide Closed; disk + links remain. |
| **E — Optional report** | Open **Case File** only if a written report is needed — linked to same Case id. Not required for every alert. |

**FTP stays where you set it for media files.**  
**Case record stays in durable store** (JSON or later DB) — **plus links** pointing at those media files.  
Not “copy every video into JSON.” Not “JSON replaces FTP.”

---

## 4. “Refresh everything gone” / “not even a log”

| Fear | Fact / action |
|------|----------------|
| Design = wipe on refresh | **No.** Cases are written under `ops-cases/`. Refresh should re-read. |
| You saw empty after refresh | Treat as **defect or storage not mounted** — diagnose under a named APPLY, do not redefine Cases as temporary. |
| “Not even a log” | **Gap.** Need append-only **case audit** (and later a simple Log/Audit view). Notes ≠ full log. |
| Clear Ops strip | Must **never** mean delete case + audit. |

Recommended later APPLYs (names only — **no code now**):

1. `OPS-CASE-BIND-EVIDENCE-V1` — link Library/FTP media into a Case  
2. `OPS-CASE-CLOSE-SETTLE-V1` — Closed / Archived + list filters  
3. `OPS-CASE-AUDIT-LOG-V1` — append-only events + simple Log UI  
4. `OPS-CASE-ARCHIVE-HIDE-V1` — clear list clutter, keep disk  

Order recommendation: **Close/settle + audit** first if trust is broken; **bind evidence** when dock/Library is the next lab beat.

---

## 5. One sentence lock

**Cases are the durable case folder spine; video stays on your Storage/FTP; they must join by link at bind/settle — not stay forever as orphan JSON with no close and no log. Refresh must not erase disk cases; empty after refresh = bug. Full EMS settle is the roadmap, not “JSON = finished product.”**

---

## Related

- Three lanes (today): `MOB-DISC-CASES-VS-CASE-FILES-VS-FTP-LOGIC-20260809.md`  
- Archive hide: `MOB-DISC-OPS-CASES-WHERE-KEPT-AND-ARCHIVE-UI-20260809.md`
