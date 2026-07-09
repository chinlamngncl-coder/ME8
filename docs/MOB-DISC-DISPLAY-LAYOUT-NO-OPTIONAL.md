# MOB DISC — Why not “Display layout (optional)”?

**Status:** DISC — **rejected** in UI. Applied MOB uses **Display layout** only.

---

## User question

> Display layout (optional) — why should there be optional?

**Answer:** It should **not**. That wording was never locked for ship.

---

## Where “optional” came from (internal mistake)

| Source | Meaning | User sees? |
|--------|---------|------------|
| Deploy genre A5 doc | Multi-monitor is **not** in Site readiness score — pointer only | No |
| MOB risk note | “optional tab rename” = dev note, not a label | No |
| Installer thinking | “Customer might only use one monitor” | **Wrong place** — don’t put in section title |

Someone could have proposed **(optional)** to mean “you can skip this for go-live.” That is **deployment policy**, not a **product section name**.

---

## Why enterprise products don’t do this

| Pattern | Example | OK? |
|---------|---------|-----|
| Section title | **Display layout** | Yes — Milestone “view layout”, Genetec “monitoring task” |
| Section title | **Display layout (optional)** | No — sounds unfinished, tender-internal |
| Field label | **Tenant name (optional)** | Yes — one field may be blank |
| Readiness row | Amber if not configured | Yes — Site readiness already handles “not done yet” |

**Rule:** Use **(optional)** only on **fields** where empty is valid. Never on a **feature area** title.

Multi-monitor is **optional for a given site** (single desk = Operations only). It is still a **named product capability** — same as Genetec video wall or Milestone Smart Wall. Those menus are not titled “(optional)”.

---

## What we ship instead

| Location | Label |
|----------|--------|
| Settings → Site readiness block | **Display layout** |
| Command Wall sub-tab | **Display layout** |
| Card title | **Standard control room layout** |
| Button | **Set up displays** / **Launch layout** |

**Site readiness** does not score display layout today — that is correct (A5 was pointer-only). If we add a row later, it should be a **soft amber** “Not configured” with **Open**, not “(optional)” in the heading.

---

## MOB applied

`mob-a5-labels-enterprise-neutral` — i18n + HTML fallbacks; **no** “(optional)” anywhere.
