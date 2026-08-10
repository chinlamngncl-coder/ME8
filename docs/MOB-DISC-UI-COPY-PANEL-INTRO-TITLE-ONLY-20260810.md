# MOB DISC — Panel intro hints: do we need to teach? (2026-08-10)

**Status:** LOCKED paper. **No code this turn.**  
**Read:** `.cursorrules` — UI = short labels / no every-page essays; manuals = teach.  
**Trigger:** Screenshots — Holds + Retention `setup-hint` still feel casual / teachy.

---

## What type of hints are these?

| On screen | i18n key | Type |
|-----------|----------|------|
| “Face snaps held… Browse here — **no need to open the server folder.**” | `evidenceHub.holdsHint` | **Panel intro** (grey line under the page title) |
| “Categories control how long Library files are kept.” | `evidenceRetention.hint` | **Panel intro** (same class of chrome) |

They are **not** errors, **not** button labels, **not** required for the feature to work.  
They are agent/lab **helper captions** — “explain the page to the operator.”

Enterprise control-room UIs (Fiori / admin consoles): **title is enough** when the nav/title already names the job (**Retention**, **Holds**). Extra “how/why/don’t open the folder” belongs in the **manual**, not under every title.

---

## Do we even have to teach on the page?

**No.** Teaching on every page is what you rejected.  
V1/V2 removed **long** essays and bombs. These two show the next problem: **short lines that still teach** (and sometimes sound casual: “Face snaps”, “FR”, “no need to…”).

| Surface | Teach? |
|---------|--------|
| Panel title + controls | **No teach** — operator works |
| Manual / Install guide | **Yes — teach professionally** |

---

## Verdict on your two lines

| Line | Verdict |
|------|---------|
| “…no need to open the server folder” | **Remove teach.** Casual + assumes confusion. Title/list is enough. |
| “Categories control how long…” | **Remove teach.** Retention title already says it. (This was our V1 shorten of a longer essay — still one teach sentence too many.) |

---

## Recommended next APPLY (when you want)

```text
MOB-APPLY UI-COPY-PANEL-INTRO-TITLE-ONLY-V1
```

**Exact scope (words / visibility only — no layout redesign):**

1. `evidenceHub.holdsHint` → empty **and** hide that hint node if present (`hidden`), **or** drop to a non-teach label only if a one-word subtitle is required — prefer **hide**.  
2. `evidenceRetention.hint` → same (hide Retention panel intro).  
3. Optional same pass: Grep other `setup-hint` under Evidence nav that only restate the title — **ask OK to Grep** first.  
4. Still **no** CSS grid/scroll/`id` removal; manuals untouched.

Until that APPLY: V1/V2 stand; these two screenshots = **remaining teach chrome**, not a full miss of V2.

---

## Agent forever

If the title already names the job, **do not** add “what this is / why / don’t do X” under it. Put that in the manual.
