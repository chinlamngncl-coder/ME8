# MOB DISC — Next UI: BWC numbers · placement · stop video

**Status:** DISC 2026-07-11 — **`mob-fr-red-toast-shell` APPLIED** · Act 1 shells complete  
**Trigger:** Roster too long; BWC IDs hard to read; **stop all video** not obvious  
**Search:** BWC number, placement, compact roster, stop video, pause watch  
**Related:** `MOB-DISC-FR-ROSTER-COMPACT-STOP-TILE-WARN.md`, `MOB-DISC-FR-WHAT-TO-DO-NOW.md`

---

## What you asked

> Next the UI? BWC numbers and placement. Stop video?

**Yes — this is the next UI genre** after Act 1 alert shells (one small shell left: red toast).  
**Three topics, two MOBs:**

| MOB | What |
|-----|------|
| `mob-fr-roster-compact-bwc` | Shorter list + **where BWC numbers show** |
| `mob-fr-stop-video-toolbar` | **Stop video** / pause / clear — plain buttons |

**Not in this genre:** tile warning text (signal lost) — separate MOB after.

---

## Today (what you see now)

### Video tiles (6 boxes)

| Shows | Does not show |
|-------|----------------|
| Top-left: `3 · Chin` (tile # + officer name) | BWC ID on tile when live |
| Centre: Waiting / Connecting / Live | Stop button on tile |

### Roster (table under tiles)

| Shows | Problem |
|-------|---------|
| Officer name + shortened ID `3402….0008` | **Tall rows** — scroll for 32 |
| Pin · Live / Rotate badge | BWC ID on **second line** eats height |
| **Start watch · Stop watch · Clear** | **Stop watch** = only way to kill all 6 streams |

### Buttons today (confusing names)

| Button | What it really does |
|--------|------------------------|
| **Start watch** | Start 6 streams + rotate |
| **Stop watch** | Stop **all 6 streams** — checkboxes **stay** ticked |
| **Clear** | Untick everyone (asks confirm if watching) |

**Gap:** No **“stop video but keep my 32 selected”** in one obvious click.  
**Gap:** No **per-tile stop** without unpin / waiting for rotate.

---

## Part A — BWC numbers (locked display rules)

### Design principle

> **Officer name is primary.** BWC ID is secondary — always available, never wastes a full row.

### Where numbers appear (recommended)

| Place | Format | Example |
|-------|--------|---------|
| **Tile label** (live) | `{slot} · {name} · {shortId}` | `3 · Chin · …0008` |
| **Tile tooltip** (hover) | Full cam ID | `34020000001329000008` |
| **Roster row** | **One line:** `{name} ({shortId})` | `Chin (…0008)` |
| **Roster tooltip** | Full ID + group | copy on click (optional later) |
| **Search** | Matches name **or** full/partial ID | type `0008` finds Chin |

**Short ID rule (locked):** last **4** digits visible — `…0008` (same as map pins).

### What we remove from default view

- Second line `ax-fr-roster-id` under every name → **merged into one line** or tooltip only  
- Duplicate long IDs in tile centre text

---

## Part B — Placement (use width, less scroll)

### Problem

```
┌── 6 video ──────────────┐  ┌ snap rail ┐
│                          │  │           │
└──────────────────────────┘  │  16 snaps │
┌── roster 32 rows ↓↓↓      │  │           │
│  (lots of empty padding) │  └───────────┘
└──────────────────────────┘
```

### Locked layout — **Phase 1** (first APPLY)

**Stay in same place** — fix density first (low risk):

| Change | Effect |
|--------|--------|
| Row height **28px** (was 36px) | ~40% less scroll |
| Pin → icon only 📌 | Narrower Pin column |
| **Two-column body** | 16 rows visible ≈ 32 devices |
| One-line name + short ID | No second line |

```
┌── 6 video ──────────────┐  ┌ snap rail ┐
│                          │  │           │
└──────────────────────────┘  │           │
┌── roster (2 cols) ────────┐  │           │
│ Chin…0008  kk…0009       │  │           │
│ … (14 rows visible)      │  └───────────┘
└──────────────────────────┘
```

### Optional **Phase 2** (only if still too tall)

Move roster to **narrow column under snap rail** — video grid gets taller.  
**MOB:** `mob-fr-roster-sidebar-layout` — **after** Phase 1 PASS.

---

## Part C — Stop video (locked toolbar)

### Operator intents

| I want to… | Button (locked label) |
|------------|------------------------|
| Start 6 streams + rotate | **Start watch** (unchanged) |
| **Stop all video now** — keep 32 ticked | **Stop video** (renamed from Stop watch) |
| Stop video **and** untick everyone | **Stop all** (one confirm) |
| Untick only (no streams) | **Clear** (unchanged) |
| Stop **one** tile | **×** on tile corner |

### Toolbar wireframe

```
[ Start watch ]  [ Stop video ]  [ Stop all ]  [ Clear ]
     2/32 selected · 0/6 live · 1 groups     Max 32 · 6 live · rotate 20s
```

| Button | Streams | Checkboxes | Server `stop-video` |
|--------|---------|------------|------------------------|
| Stop video | All 6 off | **Keep** | Yes, all active slots |
| Stop all | All off | **Clear** | Yes + clear selection |
| Clear | If watching → confirm | Clear | Stops first if watching |
| Tile × | That slot only | Keep | One cam |

**Rename only:** today’s **Stop watch** behaviour → label **Stop video** (clearer).  
**No change** to socket names or server — **tier 1 risk**.

### Per-tile ×

```
┌─────────────────┐
│ 3·Chin·…0008  × │  ← click × = stop this stream only
│                 │
│     (video)     │
└─────────────────┘
```

Rotate will fill empty slot on next tick unless pinned.

---

## Part D — Order vs other UI work

```text
Done:     6-tile · rail alert · alert drawer shell
Next:     ← YOU ARE HERE → BWC + placement + stop video (this DISC)
Then:     mob-fr-red-toast-shell (Act 1 last shell)
Later:    tile warnings (signal lost on tiles)
Then:     Act 2 engine (32 snap queue)
```

**Why BWC/stop before toast?** You use the roster every day; toast is polish.  
**Why toast before Act 2?** Finish Act 1 shells in roadmap — can swap if you prefer.

| Your call | Command |
|-----------|---------|
| **BWC + stop first** (recommended) | `MOB-APPLY mob-fr-roster-compact-bwc` |
| Toast first | `MOB-APPLY mob-fr-red-toast-shell` |

**One MOB at a time.**

---

## MOB plan (APPLY later)

| # | MOB | Files | Risk |
|---|-----|-------|------|
| 1 | `mob-fr-roster-compact-bwc` | `fr-live-watch.js`, `index.html` CSS, `en.json` | **Tier 1** — layout + labels |
| 2 | `mob-fr-stop-video-toolbar` | `fr-live-watch.js`, `en.json` | **Tier 1** — rename + Stop all + tile × |
| 3 | `mob-fr-roster-sidebar-layout` | `index.html`, CSS | **Tier 1** — optional Phase 2 |
| 4 | `mob-fr-tile-status-hints` | `fr-live-watch.js` | Tier 1 — separate genre |

**Not touched:** `video-wall.js`, PTT, SOS, `sipServer.js`, `pttServer.js`.

---

## Stability / mix-up

| Fear | Answer |
|------|--------|
| Break command wall | **No** — FR panel only |
| Mix with SOS / PTT | **No** — stop-video uses same FR `surface` as today |
| Stop video kills wall streams | **No** — FR emits `stop-video` with FR surface tag only |
| Break watch set | **Stop video** keeps ticks — by design |

---

## Small fix bundled in MOB 1

Toolbar hint still says **“4 live”** in one code fallback — `en.json` says 6. MOB 1 fixes to **6 live** everywhere.

---

## What you do

| Action | When |
|--------|------|
| Read this DISC | Now |
| Pick order: BWC first or toast first | Reply in chat |
| APPLY | `MOB-APPLY mob-fr-roster-compact-bwc` when ready |
| Test | Start watch → **Stop video** → ticks remain → streams off |
| PASS/FAIL | One line |

**No testing required** until you APPLY.

---

## Bottom line

| Topic | Plan |
|-------|------|
| **BWC numbers** | Short `…0008` on tile + one-line roster; full ID on hover |
| **Placement** | Denser rows + 2-column roster first; sidebar later if needed |
| **Stop video** | **Stop video** (keep selection) · **Stop all** · **×** per tile |
| **Risk** | Low — FR panel only, same stop-video logic as today |
| **Next APPLY** | Your choice: `mob-fr-roster-compact-bwc` or `mob-fr-red-toast-shell` |
