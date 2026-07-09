# MOB DISC — Banned jargon lock (Corporate / NHQ / TOC)

**Status:** APPLIED 2026-07-09 (`mob-vms-deploy-a3-copy-neutral-ux`)  
**User rule:** No **Corporate**, **NHQ**, **TOC**, or customer-specific org slang on **any** Settings / enterprise page.

---

## Verdict

**“Corporate” on the Users page is wrong.** Full stop.

- It does **not** mean “enterprise software.”
- It reads like HR / finance (“corporate policy”) or one customer’s tender diagram (“NHQ vs station”).
- A hospital, airport, utility, or private security customer will not know what it means.
- **Enterprise product** = clear scope words (**all dispatch groups** / **assigned groups**), not org-chart nicknames.

A3 was a **label-only** MOB. The mistake was copying **internal DISC vocabulary** into **customer-facing i18n**. That is reversed here.

---

## What is on screen today (must be removed)

| Key | Shipped (bad) |
|-----|----------------|
| `server.users.seeAllGroups` | See all stations **(Corporate)** |
| `server.users.scopeCorporate` | **Corporate** (all stations) |
| `server.users.scopeCorporateHint` | **NHQ / Corporate** — sees all… |
| `server.users.scopeStationHint` | Station / **TOC** — only assigned… |
| `server.users.hierarchyIntro` | **NHQ / Corporate** = … Station / **TOC** = … |
| `server.users.permHint` | Scope badge: **Corporate** (all stations) vs … |
| `server.users.hierarchyAssignHint` | … for **Corporate** scope |
| `server.users.colDispatchGroups` | Station scope *(vague; restore Dispatch groups)* |

**Files:** all `public/locales/*.json`, `public/index.html` fallbacks, hints rendered in `public/js/server-setup.js`.  
**CSS class** `ss-scope-corporate` is internal only — rename optional in same MOB; users never see the class name.

---

## Locked product vocabulary (any customer, any vertical)

| Idea | UI label | Tooltip / one-line hint |
|------|----------|-------------------------|
| Super admin | **Super admin** | Unchanged |
| Sees every dispatch group | **All stations** | Sees all dispatch groups on map, fleet, and SOS ledger |
| Sees only picked groups | **Assigned only** | Only assigned dispatch groups on map, fleet, and SOS ledger |
| Permission checkbox | **See all dispatch groups** | No parenthetical. No “Corporate”. |
| Column header | **Dispatch groups** | Not “Station scope” |
| Intro (one line max) | **All stations** = super admin or “See all dispatch groups”. **Assigned only** = pick groups below. | Delete second NHQ paragraph |

**Banned in UI strings (forever):** Corporate, NHQ, TOC, PNP-specific org names, tender diagram labels.

**Allowed in agent docs only** (never shipped to `locales/`): prose like “national operations desk” when explaining a customer deployment — not as a product label.

---

## What “enterprise” should look like on this page

Reference habit (VMS / IAM admin):

- **Role** → what account type  
- **Dispatch groups** → what data they see  
- **Checkbox** → plain English action (“See all dispatch groups”)  
- **Badge** → short outcome (“All stations” / “Assigned only”)  

No org-chart codenames. No second intro paragraph repeating the same thing in every row.

---

## Fix MOB (when user says APPLY)

**Name:** `mob-vms-deploy-a3-copy-neutral-ux`  
**Risk:** 1–2 — i18n + hint trim + optional column move left  
**Scope:** One MOB; no ledger / map / SOS logic changes.

1. Replace every string in table above across all locales.  
2. Remove `hierarchyIntro` paragraph from HTML (or replace with one neutral line).  
3. Remove per-cell `scopeCorporateHint` / `scopeStationHint` duplicates — badge title is enough.  
4. Move **Dispatch groups** column after **Role** so operators find it without horizontal scroll.  
5. Cache-bust `server-setup.js` + locales.  
6. Scrub **customer-facing** lines in `MOB-DISC-VMS-DEPLOY-HIERARCHY.md` that still say “Corporate / NHQ” as if shipped.

**Bench after fix:** Settings → Server Config → Dashboard → Operators — no string contains Corporate, NHQ, or TOC.

---

## Apply command

`MOB-APPLY mob-vms-deploy-a3-copy-neutral-ux`
