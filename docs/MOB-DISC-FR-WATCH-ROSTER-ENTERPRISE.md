# MOB DISC — FR Watch roster · enterprise picker (32 BWC scale)

**Status:** APPLIED 2026-07-11 (`mob-fr-watch-roster-table`)  
**Genre:** Analytics / Face recognition UX  
**Search:** FR watch roster, enterprise picker, dispatch groups, 32 BWC, super admin  
**Parent:** `MOB-DISC-FR-LIVE-POLL.md` (watch **SOP** stays: 32 set · 4 tiles · 20s rotate)

---

## Problem (user-validated)

The current Face watch device picker is a **lab prototype**, not enterprise dispatch software.

| What operators see today | Why it fails at scale |
|--------------------------|------------------------|
| Flat row of tiny checkboxes (`Chin`, `kk`, …) | 32 BWCs = unreadable chip soup |
| `max-height: 140px` scroll strip | Super admin cannot scan a shift roster |
| No search, no filter | Finding one officer = manual hunt |
| No dispatch group headers or colour pins | Same groups exist on map + fleet — **FR ignores them** |
| Pin/Unpin as micro-buttons beside each chip | No tile assignment clarity at 4-up |
| `1 selected · 0 live` hint text only | No roster summary, no group bulk actions |
| License gate only | No `frWatch` / scope for delegated operators |

**Locked SOP does NOT change:** up to 32 in watch set, 4 live tiles, 20s rotation, snapshot rail, alarms.  
**This DISC only revamps how operators *build and manage* the watch set.**

---

## Design principle

> **Reuse fleet dispatch patterns — do not invent a third roster.**

Fleet sidebar (`fleet-ui.js`), Command Wall roster (`command-wall.js`), and Display Room group picker (`cw-display-room.js`) already solve:

- Dispatch group colour dots  
- Group headers + online counts  
- Search + online/offline filter  
- Scroll-capped tables  
- Session-scoped fleet (`dispatchScope.filterFleetForUser`)

FR watch today drops `mapGroup`, ignores `global.dispatchGroupLookup`, and rebuilds a bespoke checkbox grid in `fr-live-watch.js` → `renderWatchList()`.

---

## Target UX — “Watch roster” panel

Replace `#ax-fr-watch-list` contents with a **dispatch-grade roster table** (left column under 4 live tiles).

### Layout (ASCII)

```
┌─ Face recognition ─────────────────────────────────────────────────────────┐
│ [Live] [Verify] [Watchlist] [Offline]                                      │
├────────────────────────────────────────────────────────────────────────────┤
│ Threshold ████████░░ 72%          │  Snapshot rail (16) …                 │
│                                   │                                       │
│ ┌─ 4 live tiles ─────────────┐   │                                       │
│ │ [1 Chin]  [2 —]            │   │                                       │
│ │ [3 —]     [4 —]            │   │                                       │
│ └────────────────────────────┘   │                                       │
│                                   │                                       │
│ ┌─ Watch roster ───────────────┐ │                                       │
│ │ [▶ Start watch] [■ Stop]     │ │                                       │
│ │ Search…        [All|Online]  │ │                                       │
│ │ 3 / 32 selected · 2 live     │ │                                       │
│ ├──────────────────────────────┤ │                                       │
│ │ ▼ Alpha shift    4/6 online  │ │  ← group header + bulk checkbox       │
│ │   ● Chin    [watch][pin][→1] │ │  ← colour dot, row actions            │
│ │   ● kk      [watch][pin][—]   │ │                                       │
│ │ ▼ Beta patrol    2/8 online  │ │                                       │
│ │   …                          │ │                                       │
│ │ Ungrouped        1/2 online  │ │                                       │
│ └──────────────────────────────┘ │                                       │
└────────────────────────────────────────────────────────────────────────────┘
```

### Row anatomy (one BWC)

| Column | Content |
|--------|---------|
| Watch | Checkbox — in/out of 32-cap watch set |
| Pin | Pin icon — holds tile slot (gold border on tile + row) |
| Status | Green/grey dot — online / offline |
| Group dot | Dispatch group colour (same as map pin) |
| Name | Friendly name + muted cam id on second line |
| Tile | `Live 1` badge when on a tile, or `Rotate` when in set but not pinned |
| Actions | Optional `Focus` — flash tile border (existing `flashCam`) |

### Toolbar

| Control | Behaviour |
|---------|-----------|
| **Start watch** / **Stop watch** | Same semantics as today |
| **Search** | Filter name / cam id (fleet-search pattern) |
| **Filter** | All · Online only · In watch set |
| **Summary** | `{selected}/32 selected · {live}/4 live · {groups} groups` |
| **Group bulk** | Header checkbox = add/remove all **online** in group (respect 32 cap) |
| **Clear** | Remove all from watch set (confirm if watching) |

### Visual scale rules

| Rule | Value |
|------|--------|
| Panel min-height | **280px** (not 140px) |
| Max visible rows | **12** then scroll (reuse `.fleet-scroll`) |
| Row height | **36px** touch-friendly |
| Group header | Sticky within scroll (like `.fleet-group-header`) |
| Checkbox hit area | ≥ 28×28 px — no “school project” micro labels |

---

## Data model (client)

Extend `ingestFleet()` in `fr-live-watch.js`:

```js
fleetById[id] = {
  id, name, online,
  mapGroup,           // from /api/fleet
  dispatchGroup,      // from global.dispatchGroupLookup.byDevice[id]
  groupColor,         // groupColorForDevice(id, mapGroup) — shared helper
};
```

**New shared helper (preferred):** extract `groupColorForDevice` + `buildGroupedFleetRows` from `fleet-ui.js` into `public/js/fleet-group-model.js` so FR + fleet + wall do not fork logic.

Roster render: `buildFrWatchRosterModel(fleetById, filters)` → grouped rows → HTML table (not flex chip grid).

---

## Auth & super admin

| Role | Watch roster |
|------|----------------|
| **Super admin** | All session-scoped BWCs; can save **watch profiles** (phase 2) |
| **Operator** (future `frWatch`) | Only BWCs in assigned dispatch groups |
| **No FR license** | Gate unchanged (`analytics-hub.js`) |

Phase 1: inherit existing `fleetForSession()` scope — no new API.  
Phase 2 MOB: wire `frWatch` permission from `MOB-DISC-FR-SNAP-ARCHIVE-FTP-AUTH-DELETE.md`.

Super admin confusion fix: **group headers always visible** even when collapsed; colour dot matches map pin exactly (`dispatchGroupLookup`).

---

## Watch profiles (phase 2 — optional MOB)

Enterprise sites run recurring shifts:

| Feature | Example |
|---------|---------|
| Saved profile | “Alpha night watch” = groups Alpha + Bravo, pins Chin on tile 1 |
| Quick load | Dropdown beside Start watch |
| Storage | `storage/fr-watch-profiles.json` (super admin CRUD in Settings) |

Not in phase 1 — DISC’d here so phase 1 table layout leaves room for a profile dropdown in the toolbar.

---

## Phased MOBs (one fix at a time)

| MOB | Scope | Files |
|-----|--------|-------|
| **`mob-fr-watch-roster-table`** | Grouped table + search/filter + taller panel; reuse group colours | `fr-live-watch.js`, `index.html` CSS, `en.json` |
| **`mob-fr-watch-group-bulk`** | Group header select-all / clear; online counts | `fr-live-watch.js` |
| **`mob-fr-watch-tile-badges`** | Per-row tile slot badge + pin column | `fr-live-watch.js`, CSS |
| **`mob-fr-fleet-group-shared`** | Extract `fleet-group-model.js` from fleet-ui | `fleet-ui.js`, `fr-live-watch.js`, `command-wall.js` (import only) |
| **`mob-fr-watch-profiles`** | Saved watch sets (phase 2) | `server.js` API, Settings panel |

**Not in this genre:** `video-wall.js`, `fleet-ui.js` live pin logic, `frLivePoller.js` pipeline, PTT, SOS.

---

## CSS migration

| Retire | Replace with |
|--------|----------------|
| `.ax-fr-watch-grid` flex chips | `.ax-fr-roster-table` (fork `.fleet-table` tokens) |
| `.ax-fr-watch-item` | `.ax-fr-roster-row` |
| `.ax-fr-watch { max-height: 140px }` | `.ax-fr-watch { min-height: 280px; max-height: 42vh }` |
| `.ax-fr-pin-btn` inline | `.ax-fr-roster-pin` icon column |

Keep class prefix `ax-fr-*` for Analytics scope; reuse CSS variables `--border`, `--accent`, `--ok` from fleet.

---

## i18n keys (add in `en.json`)

| Key | Default |
|-----|---------|
| `analytics.fr.rosterTitle` | Watch roster |
| `analytics.fr.rosterSearch` | Search officers… |
| `analytics.fr.rosterFilterAll` | All |
| `analytics.fr.rosterFilterOnline` | Online |
| `analytics.fr.rosterFilterSelected` | In watch set |
| `analytics.fr.groupOnline` | `{online}/{total} online` |
| `analytics.fr.tileBadge` | Live {n} |
| `analytics.fr.rotateBadge` | Rotate |
| `analytics.fr.selectGroup` | Add group to watch |
| `analytics.fr.clearWatch` | Clear watch set |

---

## Test plan (after APPLY)

| # | Step | Pass |
|---|------|------|
| 1 | 2 BWCs (lab) | Grouped rows, colour dots, search finds one name |
| 2 | Start watch | 4 tiles fill; roster shows Live 1–4 badges |
| 3 | Pin row | Tile holds; badge = pinned slot |
| 4 | 32 selected | Cap enforced; bulk group stops at 32 with toast |
| 5 | Super admin vs scoped operator | Operator sees only assigned groups (phase 2) |
| 6 | Switch Analytics tab → back | Watch set + pins persist within session |
| 7 | Hard refresh | Watch set clears (until profiles MOB) |

---

## What we are NOT doing

- Changing 4-tile / 20s / 32-cap **SOP**  
- FR inside Operations video wall  
- Replacing map pin colours or dispatch group admin  
- Touching locked live-video / PTT / SOS files  

---

## Approval

Reply **`MOB-APPLY mob-fr-watch-roster-table`** to implement phase 1 (grouped table + search + enterprise layout).  
Further MOBs only after checkpoint PASS on each.
