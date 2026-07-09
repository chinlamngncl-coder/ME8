# MOB DISC — `mob-vms-deploy-hierarchy` (enterprise)

**Status:** A1–A2 **APPLIED**; A3 neutral copy **APPLIED** 2026-07-09; **A4 site readiness APPLIED** 2026-07-09; **A5 command note APPLIED** 2026-07-09. Deploy genre **complete**.  
**UI chrome:** Tab **Identity** (internal id still `lab`); section **Reverse proxy**; TLS badges **HTTP** / **HTTPS** — no “LAB” customer label. Users show **All stations** vs **Assigned only**; checkbox **See all dispatch groups**; column **Dispatch groups** (after Role).  
**Domain:** A — VMS product & deployment (S4-1, S1-VMS, hierarchy).  
**Risk:** **2** for UI/settings/docs-in-product — **do not** touch wall / PTT / SIP / pool in this genre.  
**Audience:** Customer IT + site super admin. Habit should match big VMS / enterprise ops software.  
**Search:** `operator URL`, `deployment mode`, `dispatch groups`, `all stations`, `TLS`, `readiness`

Brochure / POC scripts stay **parked** (you own later). This MOB is **software + in-product SOP**, not a PDF pack.

---

## What “corporate / enterprise” looks like (habit users already have)

Large dispatch / VMS / SOC platforms (Genetec-class, Milestone-class, Axis/Avigilon-class, Microsoft/Cisco site admin patterns) almost always separate **three boards**:

| Board | User habit | Meaning |
|-------|------------|---------|
| **1. How we deploy** | Site profile / installation type | LAN · hybrid · cloud — one clear mode |
| **2. How people connect** | Portal / Operator URL (HTTPS bookmark) | What humans open in browser |
| **3. How devices connect** | Recording / registration endpoint | What BWCs dial (IPv4, often different from HTTPS name) |
| **4. Who sees what** | Org / site / group hierarchy | NHQ = see all; station = assigned only |
| **5. Are we ready?** | Readiness / health checklist | Green / amber items before go-live |

If any board is missing or mixed into one “IP box,” IT fight and tender demos look amateur.

---

## Honest baseline (ME8 today — already have pieces)

| Enterprise board | In product today? | Gap |
|------------------|-------------------|-----|
| Deploy mode `lab` / `lan` / `cloud` / `hybrid` | **Yes** — Server Config | Copy/hints incomplete for enterprise wording |
| **Operator login URL** | **Yes** — `deployment.operatorUrl` + Settings display | Easy to confuse with BWC IP; no HTTPS/TLS checklist in-product |
| **BWC register IP** (`publicHost`) | **Yes** — SIP / dock path | Must stay IPv4 for keypad; already constrained |
| Trust reverse proxy | **Yes** — Lab Security / trust proxy | Buried; not named as “Production TLS” step |
| Dispatch groups + assign to operators | **Yes** | Real **hierarchy labels** weak (NHQ / Station not first-class) |
| `seeAllDispatchGroups` | **Yes** on perms | Enterprise habit = “Corporate / NHQ role” not a buried checkbox |
| Multi-monitor / TV wall | **Partial** — Command / display room | SOP not in Server Config readiness |
| License / perpetual | **Yes** — license file | Not part of this MOB’s runtime |
| **Readiness checklist** (one screen) | **Weak / scattered** | Big gap vs corporate products |

**Do not rebuild** dispatch groups or invent a deep org-tree database in v1. **Productize** what exists into enterprise habit.

---

## Locked product model (this MOB)

### A1 — Deployment profile (one card)

Server Config → clear **Deployment** section (existing fields, enterprise copy):

| Field | Habit name | Rule |
|-------|------------|------|
| Mode | Deployment type | LAN / Hybrid / Cloud (lab = internal only) |
| Operator URL | **Operator portal URL** | What humans bookmark — prefer `https://…` |
| Public / BWC host | **Device registration address** | IPv4 for BWC; never force hostname on keypad path |
| Hint | Auto text by mode | Matches big-vendor “site type” help |

**Invariant:** Changing Operator URL must **not** silently rewrite BWC register IP (and reverse). Two fields, two jobs — same as enterprise VMS “Portal URL” vs “Camera/ server IP.”

### A2 — Production access (TLS / proxy) — in product, not a Word doc

One **Production access** block (super admin):

| Item | Behaviour |
|------|-----------|
| Operator URL shows `http` vs `https` | Badge: **Lab / http** vs **Production / https** |
| Trust reverse proxy | Same flag as today — labeled for production nginx/IIS/Caddy |
| Checklist lines (read-only tips) | “Terminate TLS at reverse proxy · keep app port internal · set Operator URL to public https” |
| Optional: copy Operator URL | One click — habit from every SaaS admin console |

No full ACME/Let’s Encrypt inside Node in v1 (enterprise usually terminates TLS **in front**). Document that in the checklist, like big installers do.

### A3 — Organization hierarchy (enterprise labels on existing RBAC)

Do **not** invent a new tree UI in wave 1. Map habits onto **current** machinery:

| Enterprise habit | ME8 mapping |
|------------------|-------------|
| **NHQ / Corporate** | `super_admin` **or** operator with **See all groups** |
| **Station / TOC** | Operator with **assigned dispatch groups** only |
| **Talk-group / map colour** | Existing dispatch groups |

**UI (corporate style):**

- Users admin: role column / badge **Corporate (all stations)** vs **Station-scoped**  
- When assigning groups: short line — “Station operators only see assigned groups on map, fleet, SOS ledger.”  
- Optional display names on groups stay; no forced rename of internal IDs  

Hierarchy **enforcement** already exists for SOS ledger / map scope — this MOB makes it **obvious and trainable**, not a brochure table.

### A4 — Site readiness (the missing corporate screen)

One **Site readiness** panel (Server Config or Overview strip) — pattern from enterprise installers (“Deployment health” / “Getting started”):

| Check | Green when |
|-------|------------|
| Operator portal URL set | Non-empty; warn if `http://` on cloud/hybrid |
| Device registration IP set | Valid IPv4 / publicHost |
| License present | `platform-license` ok |
| Dispatch groups ≥ 1 | At least one group for real ops |
| ≥1 station-scoped operator **or** documented NHQ-only | Soft warn if only global |
| FTP / storage path reachable | Reuse storage status if already available |
| Trust proxy + https Operator URL | Soft amber if cloud/hybrid + http |

Clicks deep-link to the setting to fix — same habit as Microsoft 365 / Azure “Setup guide.”

**Risk:** read-only status + links. No live video changes.

### A5 — Multi-monitor command (pointer only)

Short in-product note under Deployment / readiness:

- Operations wall = primary  
- Display / command room = TV wall (existing feature)  
- Do **not** rebuild wall in this MOB  

---

## OUT of scope (parked or later genre)

| Item | Why |
|------|-----|
| Brochure PDF / tender affidavit | You parked outside software |
| Deep AD/LDAP OU tree sync | Identity genre / OIDC later |
| Built-in HTTPS certificates on Node | Enterprise = reverse proxy |
| Live wall / PTT / SIP / pool | Risk 5 — forbidden here |
| Facial / Analytics hub | Domain E — last |
| Auto cold-archive policies | Evidence genre — done separately |

---

## APPLY slices (one at a time — recommended)

| Slice | MOB name | Status | Ships |
|-------|----------|--------|-------|
| **1** | `mob-vms-deploy-a1-a2-portal-tls` | **Done** 2026-07-08 | Clarify Operator portal URL vs device IP; Production access card; https/http badge; proxy wording + `/api/production-access` |
| **2** | `mob-vms-deploy-a3-hierarchy-labels` | **Done** 2026-07-08 | Scope badges + dispatch column (superseded by neutral copy MOB) |
| **2b** | `mob-vms-deploy-a3-copy-neutral-ux` | **Done** 2026-07-09 | All stations / Assigned only; See all dispatch groups; column after Role; no NHQ/TOC/Corporate in UI |
| **3** | `mob-vms-deploy-a4-site-readiness` | **Done** 2026-07-09 | Site readiness panel + `/api/site-readiness` + row deep links |
| **4** | `mob-vms-deploy-a5-command-note` | **Done** 2026-07-09 | Multi-monitor note + Open Command Wall under Site readiness |

Never bundle 1–4 with live MOBs. After each slice: Settings-only smoke (no Open All required).

---

## Risk to top-stable

| System | This genre |
|--------|------------|
| Wall / pin / pool | Untouched |
| PTT / SIP | Untouched |
| SOS ingest | Untouched |
| Evidence encrypt / archive | Untouched |
| Server Config save + reverify | Same gate as today |

Wrong IMPLEMENTATION risk: overwriting `publicHost` when saving Operator URL — **forbid** in APPLY.

---

## Bench (after each slice)

1. `RESTART-FLEET.bat` → hard refresh  
2. Server Config: Operator URL ≠ BWC IP still independent  
3. Save settings (reverify with **current** password)  
4. Hierarchy labels match assigned groups / see-all  
5. Readiness shows expected green/amber  
6. Spot-check: one cam live **optional** — if any live regression → FAIL and stop genre  

---

## Suggested next

Reply: **`MOB-APPLY mob-vms-deploy-a4-site-readiness`**

Then A5. Rescue Phase 1 stays separate (risk 4 + checkpoint).
