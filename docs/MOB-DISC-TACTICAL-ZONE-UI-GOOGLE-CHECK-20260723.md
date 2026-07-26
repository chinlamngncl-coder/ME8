# MOB DISC — Tactical Zone UI prep (Google check) · no logic

**Date:** 2026-07-23  
**Status:** PAPER for **Google UI review** — **no APPLY · no code · no Turf · no sockets · no vault**  
**Operator:** PTT visual alert **PASS**. Prepare Tactical setup — **especially UI**. Agent has a habit of messing up UI; this disc freezes the **look and layout** only.  
**Architecture lock (logic later):** `MOB-DISC-TACTICAL-ZONE-EVIDENTIARY-ENGINE-AFTER-VIDEO-VULN-20260721.md`

---

## Why this disc exists

| Want | Not this disc |
|------|----------------|
| Screens, chrome, copy rules Google can approve | Backend Turf / GPS loop |
| Where Tactical sits in Axiom nav | Entry → `startPlay` / PTT gtid 49 |
| Wireframes Module 1 (and UI shells 2–4) | Export AES / FFmpeg |
| Anti-mess rules so agent does not freestyle CSS | Any `index.html` edit tonight |

**Gate:** Google / operator OK on this UI paper → then a **named** first APPLY (shell only). Until then: **zero product edits**.

---

## Product face (locked)

| Item | Value |
|------|--------|
| Customer product | **Mobility Axiom** (Ubitron) |
| Module name (internal / tab) | **Tactical** (short) |
| Full capability name | Tactical Zone & Evidentiary Engine |
| Stack | Fleet UI chrome + **own** Leaflet map + later WVP/PTT plugs — **not** a new app |

---

## Agent UI failure modes (banned before first APPLY)

These are how past MOBs “messed up UI.” Google: reject any future APPLY that does these.

| Habit | Ban |
|-------|-----|
| New purple / glow / card festival | Keep **existing** dark enterprise tokens in `public/css/global.css` only |
| Parallel CSS file / “Tactical design system” | Extend `global.css` + scoped `#ax-panel-tactical` — no second theme |
| Teaching essays under every box | Short labels only (`MOB-DISC-UI-COPY-SHORT-NO-TEACH`) |
| Clutter Ops map with draw tools | Tactical = **separate tab + separate map instance** |
| Rebuild nav / rename Axiom / invent top chrome | Add **one** nav button beside existing tabs |
| Fat left rail that fights Ops fleet panel | Mirror Ops rhythm: left tools ~same width language as `#sidebar`, center map fills |
| Duplicate video wall / pin dock on Tactical day-1 | Module 1 shell = **map + draw + zone list** only — live wall stays Ops |
| Inline 2000-line style dump in `index.html` | Prefer scoped rules in `global.css`; keep IDs stable |
| Emoji / mojibake icons | ASCII or CSS unicode escapes already used elsewhere (`\\1F4CC` pattern) |
| “Helpful” second map on Ops | Forbidden |

---

## Where it lives in the console (nav)

**Today (do not reorder):**

`Operations` · `Evidence & Docking` · `Command Wall` · `Centre Summary` · `Video Conference` · `Settings` · `Analytics`

**Add one tab (Module 1 shell):**

`… · Analytics · **Tactical**`

| Rule | Detail |
|------|--------|
| Placement | After **Analytics** (end of product tabs) — not between Ops and Evidence |
| Label | **Tactical** (i18n key `nav.tactical`) — not “Tactical Zone & Evidentiary Engine” in the tab |
| Active state | Same `.active` class as other `nav-tab-*` buttons |
| Visibility | Same RBAC pattern as other tabs (default: roles that see Ops; SuperAdmin-only export later Module 4) |
| Leaving Ops | Switching to Tactical **does not** stop live wall / PTT (same as switching to Analytics today) |

---

## Module 1 — Smart Perimeters · UI wireframe (Google focus)

### Layout (one composition — not a dashboard salad)

```
┌─ TOP NAV (existing Axiom bar + tabs) ─────────────────────────────────┐
│  …  Analytics  [Tactical]                                              │
├──────────────────┬────────────────────────────────────────────────────┤
│ LEFT RAIL        │ CENTER — Tactical map (own Leaflet instance)         │
│ ~ fleet width    │                                                      │
│                  │   [draw toolbar: polygon | circle | edit | delete] │
│ INCIDENT         │                                                      │
│  Incident ID     │                                                      │
│  [text field]    │            ████ map fills remaining height ████     │
│                  │                                                      │
│ ZONES            │   (fleet GPS dots optional later — not day-1 clutter)│
│  list rows       │                                                      │
│  name · type     │                                                      │
│  ACTIVE/…        │                                                      │
│  [Archive] later │                                                      │
│                  │                                                      │
│ DRAW             │                                                      │
│  Polygon         │                                                      │
│  Circle          │                                                      │
│  Clear draft     │                                                      │
│  [Save zone]     │                                                      │
│                  │                                                      │
│ STATUS (1 line)  │                                                      │
│  Idle / Draft /  │                                                      │
│  Zone saved      │                                                      │
└──────────────────┴────────────────────────────────────────────────────┘
```

**No** right-side video matrix on Module 1 shell.  
**No** Messages / PTT Groups / Call Groups on this tab (those stay Ops).  
**No** teaching paragraph under INCIDENT / ZONES / DRAW.

### Left rail — exact chrome language

Reuse Ops patterns:

| Control | Pattern |
|---------|---------|
| Section titles | Same as Ops status boxes (small caps / existing `.status-box` / `.enterprise-card` — pick **one**, not both nested) |
| Buttons | Existing `.btn` / `.btn-action` / `.btn-ghost` / `.btn-sm` |
| Inputs | `.form-control` / `.enterprise-form-control` (max-width ~400px) |
| Lists | Compact rows like fleet list — one line each; no card-per-zone towers |
| Empty list | One short line: `No zones` — not an essay |

### Map toolbar (on-map, Leaflet.draw style)

| Control | Label (short) | Notes |
|---------|---------------|--------|
| Polygon | **Polygon** | Smart Perimeter |
| Circle | **Circle** | SOS Auto-Quarantine radius |
| Edit | **Edit** | Existing Leaflet.draw |
| Delete | **Delete** | Selected shape |
| Save | **Save zone** | Disabled until Incident ID + valid shape |

Toolbar sits **on the Tactical map** (Leaflet control corner), same spirit as Ops map toolbar — not a floating marketing badge.

### Zone list row (one line)

```
[●] Perimeter · Downtown · ACTIVE     [⋯]
[○] Quarantine · SOS-12 · ACTIVE      [⋯]
```

| Field | UI |
|-------|-----|
| Type | `Perimeter` or `Quarantine` (not long product names) |
| Name | Short editable later; day-1 can be auto `Zone 1` |
| State | `ACTIVE` only on shell (ARCHIVED appears Module 2) |
| Menu | Later: Archive / Delete — **hide** until Module 2 APPLY |

### Copy rules (Module 1)

| OK | Forbidden |
|----|-----------|
| `Tactical` | Long subtitle under nav |
| `Incident ID` | “Enter the incident ID used for the vault…” |
| `Save zone` | “This will emit create-tactical-zone to UbitronC2…” |
| Status: `Saved` / `Need shape` / `Need incident` | Multi-sentence how-to |

### What Module 1 shell **shows** vs **does** (for Google)

| Shows (UI) | Does **not** do in first UI-only APPLY |
|------------|----------------------------------------|
| Tab + empty map + draw chrome + list shell | Turf point-in-polygon |
| Incident ID field | Auto `startPlay` / wall mount |
| Save button enabled state | PTT gtid 49 inject |
| Placeholder list | Real vault write |

**First code APPLY (when named later)** should still be **UI shell only** unless Google also approves a thin “save GeoJSON to memory / list” with **no** media side effects. Default agent pick: **shell + draw + local list stub** — media hooks = later MOB.

---

## Modules 2–4 — UI shells only (so Google sees the whole face)

No logic here — screens Google should expect later. Do not build in Module 1 APPLY.

### Module 2 — Archiver (UI)

| Surface | Look |
|---------|------|
| Same Tactical tab | Zone row gains state `ARCHIVED` |
| SuperAdmin control | One button: **Archive** on ACTIVE zone |
| No new top-level tab | Stay under Tactical |

### Module 3 — AAR / Timeline (UI)

| Surface | Look |
|---------|------|
| Sub-panel under Tactical **or** secondary view toggle: `Live` \| `AAR` | Two-mode switch — not a fifth nav product |
| AAR mode | Map (ghosts) **top or left**; timeline scrub **bottom**; video **one** pane using **existing** FLV/`<video>` patterns — not a new player brand |
| Trimmer | Dual handles + **Export slice** — short labels |

### Module 4 — Evidentiary export (UI)

| Surface | Look |
|---------|------|
| Gate | SuperAdmin + PIN modal (existing modal language) |
| Action | **Export pack** |
| Progress | One status line — not a wizard of 8 steps |
| Offline | `View-Evidence.html` is **outside** dashboard — do not embed a fake browser chrome inside Axiom |

---

## Tokens / CSS (reuse — do not invent)

From consolidation PASS:

- `public/css/global.css` — `--bg-base`, `--bg-surface`, `--border-color`, `--text-primary`, `--accent-blue`, spacing tokens  
- `.enterprise-card`, `.btn-primary`, `.btn-secondary`, form max-width  
- Leaflet already vendored for Ops — **second map instance**, same CSS theme (dark tiles if Ops uses them)

**Do not:** new accent purple, glassmorphism, rounded-full pill clusters, multi-shadow marketing cards.

---

## Proposed APPLY ladder (after Google UI OK — still one at a time)

| Step | Phrase (example) | UI only? |
|------|------------------|----------|
| G0 | This disc — Google / operator **UI OK** or **UI FAIL + notes** | Paper |
| 1 | `TACTICAL-TAB-SHELL-UI-V1` | **Yes** — nav + empty panel + map host + left rail chrome (draw may be stub) |
| 2 | `TACTICAL-LEAFLET-DRAW-V1` | UI + GeoJSON in browser — **no** Turf auto play |
| 3 | `TACTICAL-TURF-ENTRY-EXIT-V1` | Logic — media/PTT hooks (separate review) |
| 4+ | Archiver / AAR / Export | Per architecture disc |

Agent must **not** jump to step 3 because “UI is empty without logic.”

---

## Checklist for Google (approve / reject)

Please mark each:

| # | Item | OK? |
|---|------|-----|
| 1 | Tab label **Tactical** after Analytics | |
| 2 | Separate map — never draw tools on Ops map | |
| 3 | Left rail + full center map (no video wall on day-1) | |
| 4 | Short copy only — no teaching essays | |
| 5 | Reuse `global.css` tokens — no new theme | |
| 6 | Module 1 first APPLY = shell/draw only — no Turf media | |
| 7 | AAR = mode switch under Tactical, not new nav app | |
| 8 | Export = SuperAdmin modal + offline viewer separate | |
| 9 | Brand stays **Mobility Axiom** / Ubitron | |
| 10 | Ban list (purple/glow/clutter Ops/parallel design system) | |

**Reply format for operator after Google:**  
`UI OK` → next say `MOB-APPLY TACTICAL-TAB-SHELL-UI-V1`  
or `UI FAIL` + which row numbers to change.

---

## Agent must not (until named APPLY + UI OK)

- Edit `public/index.html` / `global.css` / map JS for Tactical  
- Start Turf / `create-tactical-zone` / vault / AES  
- “Preview” freestyle CSS in a branch without APPLY  
- Clutter Ops or rename product  
- Bundle Module 1–4 in one MOB  

---

## One line

**PTT PASS stamped. Tactical Module UI is frozen here for Google: one Tactical tab, own map, Ops-matching chrome, short labels, shell before logic — no code until UI OK + named APPLY.**
