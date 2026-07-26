# MOB DISC — Tactical Zone plan + UI draft (proceed after OK)

**Date:** 2026-07-23  
**Status:** PAPER DRAFT — **no APPLY · no code** until you name a phrase  
**Closed behind us:** PTT visual alert = **PASS** (leave alone; no Google harden MOBs unless FAIL)  
**Architecture (logic later):** `MOB-DISC-TACTICAL-ZONE-EVIDENTIARY-ENGINE-AFTER-VIDEO-VULN-20260721.md`  
**UI Google check:** `MOB-DISC-TACTICAL-ZONE-UI-GOOGLE-CHECK-20260723.md`  
**CSS system:** `global.css` consolidation PASS — **reuse, do not invent**

---

## One-screen

| Item | Lock |
|------|------|
| What we build next genre | **Tactical Zone** (Module 1 shell first) |
| What we do **not** reopen | PTT pulse, messaging, battery, hybrid SIP, Settings polish, VC layout (separate genre), live video PASS surfaces |
| CSS | **Only** `public/css/global.css` tokens + scoped `#ax-panel-tactical` — no new theme file |
| First APPLY (when you say) | `TACTICAL-TAB-SHELL-UI-V1` — tab + empty map host + left rail chrome — **no Turf / no auto live / no PTT inject** |
| Brand | **Mobility Axiom** / Ubitron — tab label **Tactical** |

---

## Sacred: do not touch (finished / parked)

Agent must **not** edit these for Tactical work unless you name them in a separate APPLY:

| Area | Why |
|------|-----|
| Ops wall / pin / FLV handoff / stop chrome | PASS genre |
| Command Wall / FR live / popouts | PASS |
| PTT Groups / mesh / Call Groups / PTT visual alert | PASS |
| Evidence redact path | PASS |
| VC LiveKit join / host (layout genre = **separate** later) | Leave tree alone |
| `video-wall.js` pin mirror cores | Firmware Gold |
| Messaging `:6000` | Forgotten |
| Companion battery / Record toast | Parked |
| Settings theme polish | Skipped |
| WVP handoff flag / docker | Base stays ON — do not “fix” by turning off |

Tactical = **additive** tab + later hooks into **existing** `startPlay` / PTT — not a rewrite of Ops.

---

## CSS / UI rules (unified — no stupid things)

Copied from consolidation + prior Tactical UI disc. **Non-negotiable on every Tactical APPLY:**

| Rule | Detail |
|------|--------|
| Tokens | `--bg-base`, `--bg-surface`, `--border-color`, `--text-primary`, `--accent-blue`, `--space-*` from `global.css` |
| Cards / buttons | `.enterprise-card`, existing `.btn` / `.btn-action` / `.btn-ghost` / `.btn-sm` |
| Forms | `.form-control` / `.enterprise-form-control` (max-width ~400px) |
| Scope | All new rules under `#ax-panel-tactical` (or `#app-view-tactical`) in **`global.css`** |
| Ban | Parallel `tactical.css`, purple/glow, glass cards, teaching essays, emoji mojibake, stuffing draw tools onto Ops map |
| Inline style | Prefer **not** dumping a second theme into `index.html` `<style>`; minimal markup IDs only |
| Copy | Title + button + one-line status — manuals later |
| Nav | **One** new tab after Analytics — do not reorder existing tabs |

---

## Agent recommendation (agree / pick)

### Product sequence (locked)

```
1) TACTICAL-TAB-SHELL-UI-V1     ← draft below (UI only)
2) TACTICAL-LEAFLET-DRAW-V1     ← draw polygon/circle → GeoJSON in browser / list stub
3) TACTICAL-TURF-ENTRY-EXIT-V1  ← GPS in/out → existing WVP startPlay + PTT gtid 49
4) Zone Archiver (Module 2)
5) AAR / trim (Module 3)
6) Evidentiary export (Module 4)
```

One MOB at a time. **Never** jump to Turf/media while shell still FAIL.

### What I recommend for the draft (agree)

| Choice | Recommendation | Why |
|--------|----------------|-----|
| Tab place | After **Analytics** | End of product tabs; doesn’t shove Ops |
| Layout | Left rail + full-bleed **own** Leaflet | Matches Google + Ops rhythm; no clutter Ops |
| Day-1 map content | Empty map + draw chrome placeholders | No GPS clutter / no wall clone |
| Incident ID | Short text field | Required for later vault key |
| Zone list | Compact one-line rows | No card towers |
| Live video on Tactical day-1 | **None** | Live stays Ops; entry auto-open = Module 3 APPLY |
| Archive / AAR / Export UI | Shell placeholders **hidden** until their MOB | Don’t fake finished product |
| RBAC day-1 | Same as Ops viewers | Export PIN = Module 4 only |

### What I reject in the draft

| Temptation | Reject |
|------------|--------|
| Embed Ops video wall inside Tactical | Dual wall = mess + Gold risk |
| Draw polygons on daily Ops map | Google forbid clutter |
| New color palette for “tactical red” theme | One accent; zone polygon color can be CSS later, still token-based |
| Build Modules 1–4 in one APPLY | Guaranteed UI+logic mess |
| “Helpful” tutorial under Incident | Short labels only |

---

## Draft UI — Module 1 shell (wireframe)

```
┌─ Axiom nav … Analytics │ Tactical │ ──────────────────────────────┐
├────────────────┬──────────────────────────────────────────────────┤
│ LEFT RAIL      │  #ax-tactical-map  (Leaflet instance #2)          │
│ .enterprise-   │                                                  │
│  card blocks   │     [ Polygon ] [ Circle ] [ Edit ] [ Delete ]   │
│                │           (toolbar on map — Leaflet.draw)        │
│ INCIDENT       │                                                  │
│  Incident ID   │              map fills height                    │
│  [________]    │                                                  │
│                │                                                  │
│ ZONES          │                                                  │
│  No zones      │                                                  │
│                │                                                  │
│ DRAW           │                                                  │
│  [Save zone]   │  (disabled until ID + shape — shell: visual only)│
│                │                                                  │
│ status: Idle   │                                                  │
└────────────────┴──────────────────────────────────────────────────┘
```

**Shell PASS look (operator):**  
Click **Tactical** → panel opens → dark enterprise chrome matches Analytics/Evidence → empty map area visible → left labels short → Ops still works when you leave the tab → **no** change to wall/PTT/Evidence.

---

## First APPLY scope (when you order)

**Phrase:** `MOB-APPLY TACTICAL-TAB-SHELL-UI-V1`

| In | Out |
|----|-----|
| Nav button `nav-tab-tactical` + `app-view-tactical` / `#ax-panel-tactical` | Turf.js / GPS loop |
| Panel layout (rail + map host div) | `create-tactical-zone` socket |
| CSS in `global.css` scoped | Auto `startPlay` / PTT gtid 49 |
| i18n keys: `nav.tactical`, short rail strings | Zone vault DB |
| Cache bust | Touch `video-wall.js`, PTT, Evidence, VC |
| Optional: init empty Leaflet (same vendor as Ops) **no draw yet** if trivial | Leaflet.draw (that = DRAW-V1) |

**Agent pick if ambiguous:** Shell **with** empty Leaflet map (tiles only) looks real; draw tools = next MOB. Prefer empty map over a grey placeholder box.

---

## Later modules (reminder only — not this APPLY)

| Module | UI face | Logic |
|--------|---------|-------|
| 2 Archiver | Zone state ACTIVE → ARCHIVED | Background vault |
| 3 AAR | Mode `Live` \| `AAR` under Tactical | Ghosts + trim `-c copy` |
| 4 Export | SuperAdmin + PIN modal | AES zip + custody |

---

## Operator gate

1. Read this draft.  
2. Say **`TACTICAL DRAFT OK`** (or FAIL + what to change).  
3. Then: **`MOB-APPLY TACTICAL-TAB-SHELL-UI-V1`**.

Until step 3 → **zero code**.

---

## Agent must not (this genre)

- Touch PASS / parked / forgotten features listed above  
- Invent a second design system  
- Start Turf or media hooks in shell MOB  
- Clutter Ops map  
- Bundle VC-MEETING-LAYOUT with Tactical  

---

## One line

**PTT stays PASS. Tactical = additive Module 1 shell first on unified `global.css`; draft locked here; code only after `TACTICAL DRAFT OK` + named APPLY — nothing else gets touched.**
