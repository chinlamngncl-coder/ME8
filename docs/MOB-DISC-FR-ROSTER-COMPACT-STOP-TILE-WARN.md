# MOB DISC — FR compact roster · easy stop · tile warnings

**Status:** DISC 2026-07-11 — **`mob-fr-tile-status-hints` APPLIED** (Part C) · Parts A/B via prior MOBs · see `MOB-DISC-FR-NEXT-UI-BWC-PLACEMENT-STOP.md`  
**Trigger:** Roster **too tall** — scroll 32 is wrong; **stop all streams** too hard; video tiles need **signal-lost / no-stream** hints on the wall  
**Search:** compact roster, stop all, pause watch, tile warning, signal lost, no stream  
**Related:** `MOB-DISC-FR-WATCH-ROSTER-ENTERPRISE.md`, `MOB-DISC-FR-GENRE-ROADMAP-UI-ENGINE-ALERT.md`

---

## Problems (from screenshot + operator)

| # | Issue | Today |
|---|-------|--------|
| 1 | Roster eats vertical space under 6 tiles | `min-height: 280px`, **36px rows**, table under grid → scroll for 32 |
| 2 | Stop every BWC / all streams | **Stop watch** exists but easy to miss; no **pause video keep selection**; no per-tile stop |
| 3 | Blank / “Waiting” on tiles | Little context when **offline, SIP fail, signal lost, cap hit** |

**Park until:** Act 1 core MOBs done (6-tile, rail/alert shells). **Design-only** — no APPLY in this pass.

---

## Part A — Compact roster (use width, not height)

### Design goal

> **See 12–16 officers without scrolling** on a normal laptop; reach 32 via search or one group expand — not a 32-row ladder under the video grid.

### Option 1 — **Roster beside snapshot rail** (recommended)

```
┌─ 6 video (3×2) ─────────────┐  ┌─ Snap rail ─┐
│                              │  │              │
└──────────────────────────────┘  │              │
┌─ Watch roster (compact) ─────┐  │              │
│ [toolbar one line]           │  │  16 snaps    │
│ PP ▼  Chin kk … (2 cols)    │  │              │
└──────────────────────────────┘  └──────────────┘
```

Move `#ax-fr-watch-list` **right column** under crop rail (narrow **~240px**), video+roster left gets full height.

| Pros | Cons |
|------|------|
| Video grid **taller** | Narrow names (ellipsis) |
| Roster scroll **shorter** visually | Layout refactor |

### Option 2 — **Two-column roster table** (same place, less height)

| Change | Value |
|--------|--------|
| Row height | **28px** (was 36px) |
| Cam ID | **Hover/tooltip only** — one line name |
| Pin | Icon **📌** 24px — no text button |
| Table body | **CSS columns: 2** — two logical tables side by side |
| Visible rows | **~14** before scroll |

### Option 3 — **Horizontal watch chips** (minimal scroll)

Selected 32 as **wrap chips** in **one band** under toolbar (max 2 lines, then scroll **horizontal**):

`[Chin ×] [kk ×] [Officer 3 ×] …`

Full group picker → **slide drawer** or modal for add/remove.

| Pros | Cons |
|------|------|
| Zero vertical scroll for selection | Less group context in chip strip |

### Locked recommendation

| Ship | Approach |
|------|----------|
| **v1** | **Option 2** (quick) + row density |
| **v1.1** | **Option 1** (layout) if still tight |

**MOB:** `mob-fr-roster-compact-density` then `mob-fr-roster-sidebar-layout` (optional).

---

## Part B — Easier stop (all streams)

### What operators need

| Intent | Today | Target |
|--------|-------|--------|
| Stop **all live video** now | **Stop watch** (one button) | Keep — make **primary red-outline** when watching |
| Keep **32 selected**, stop video only | Not clear | **Pause video** — stops 6 streams, **keeps** watch set + probe queue (Act 2) |
| Stop **one tile** | Must unpin / wait rotate | **×** on tile label — `stopSlot` only |
| Clear selection | **Clear** | Keep |
| Emergency “everything off” | Stop + Clear two clicks | **Stop all** = Pause video + optional clear (confirm) |

### Toolbar (locked)

```
[▶ Start]  [■ Stop video]  [⏸ Pause]  [✕ Stop all]  [Clear]
```

| Button | Action |
|--------|--------|
| **Start watch** | Fill 6 tiles, start rotate |
| **Stop video** | Same as today **Stop watch** — all `stop-video`, end watching |
| **Pause video** | Stop 6 streams; **remain** in watch set; resume with **Resume** |
| **Stop all** | Pause + **Clear** watch set (one confirm dialog) |
| **Clear** | Uncheck all (confirm if watching) |

**No hunting per BWC** — one click stops **all 6 pool streams** for this operator.

**MOB:** `mob-fr-watch-pause-resume` + `mob-fr-tile-stop-btn` + `mob-fr-stop-all-prominent`.

---

## Part C — Video tile warnings (on the wall)

### States (locked copy — `en.json`)

| State | Tile shows | Border |
|-------|------------|--------|
| **Idle** | `Select officers and Start watch` | grey |
| **Waiting** | `Waiting for slot` | grey |
| **Connecting** | `Connecting…` + spinner | blue pulse |
| **Live** | (video) + officer name | blue |
| **Offline** | `BWC offline` | amber |
| **No stream** | `No video signal` | amber |
| **Signal lost** | `Signal lost — retrying…` | amber pulse |
| **Stream error** | `Stream error` | red |
| **Invite failed** | `Could not start live` | red |
| **Live cap** | `Server live limit — try Pause other views` | amber |
| **Pinned** | gold inset + label | gold |

### Behaviour

| Trigger | Tile state |
|---------|------------|
| `start-video` sent | Connecting |
| `video-stream-ready` | Live |
| `video-stream-error` | Stream error / Invite failed (parse reason) |
| No WS frames **15s** | Signal lost → auto retry once |
| `device-offline` / fleet | BWC offline |
| `pool` cap reject | Live cap |

**Large readable text** centered in tile (not tiny corner) — operator glances from 2m.

**MOB:** `mob-fr-tile-status-hints` + socket/timeout wiring — **APPLIED 2026-07-11** (`fr-live-watch.js`, `index.html`, `en.json`).

---

## Part D — placement in roadmap

| When | MOB |
|------|-----|
| After `mob-fr-red-toast-shell` (Act 1) | `mob-fr-roster-compact-density` |
| Same window | `mob-fr-watch-pause-resume` + `mob-fr-stop-all-prominent` |
| Before Act 3 alert test | `mob-fr-tile-status-hints` |
| Optional polish | `mob-fr-roster-sidebar-layout` |

**Does not block** Act 2 engine or Act 3 alert.

---

## APPLY (later — not now)

```text
MOB-APPLY mob-fr-roster-compact-density
MOB-APPLY mob-fr-watch-pause-resume
~~MOB-APPLY mob-fr-tile-status-hints~~ — APPLIED 2026-07-11
```

---

## Bottom line

| You said | Plan |
|----------|------|
| Roster too long | **Denser rows**, optional **2-col / sidebar** — no 32-row scroll under video |
| Hard to stop all | **Stop video / Pause / Stop all** — one click, no per-BWC hunt |
| Warnings on video wall | **Full tile messages** for offline, signal lost, no stream, errors |
| Do later | **Parked** — after current Act 1 MOBs |

Continue Act 1 now:

```text
MOB-APPLY mob-fr-rail-alert-shell
```
