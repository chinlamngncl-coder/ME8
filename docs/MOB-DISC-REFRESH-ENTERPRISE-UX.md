# MOB DISC — Webpage refresh: why everything dies · enterprise behaviour

**Status:** DISC only — **no APPLY** (2026-07-13)  
**Trigger:** Operator — refresh clears BWC online feel, cameras, snapshots; stuck video → F5 → square one; how do enterprise systems behave?  
**Search:** F5, refresh, session restore, live video kill, enterprise UX  
**Related (locked earlier):** `MOB-DISC-OPERATOR-REFRESH-SESSION-RESTORE.md`, `MOB-DISC-REFRESH-GUARD-LIVE-WARN.md`

---

## Short answer

| Question | Answer |
|----------|--------|
| Why does refresh wipe live video / FR watch / open pins? | Browser **reloads from zero**. Your old socket dies → server **drops your live viewer refs** → BWC encode often **stops**. Client layout lived in **memory**, not on disk. |
| Is that “enterprise quality”? | **No** as a finished product story. Enterprise VMS / CAD aim for **reconnect + restore**, not “start over.” |
| Can we afford redo-everything? | **No.** Accidental F5 during incident is a real failure mode. |
| Do we already survive *some* things? | **Yes** — SOS open alarms, GPS tracks, fleet roster, **kept evidence packs** on disk. Live UI does **not**. |

**One line:** Refresh today = new desk that forgot your open cameras. Enterprise target = same desk, streams/layout come back.

---

## What users feel vs what is true

| Feels like | Reality |
|------------|---------|
| “BWCs went offline” | Devices often still registered; **your** live sessions + UI state cleared. Roster refills after reconnect. |
| “Snapshots gone” | **Rail** is ephemeral. **Ledger** (`storage/fr-snap-ledger/`) and **Keep packs** (`storage/fr-kept/`) stay on server. |
| “Whole system reset” | Server process still up; only **this browser session’s live work** was torn down. |

---

## How serious enterprise systems behave

| Pattern | What operators get |
|---------|-------------------|
| **Session / subscription owned by server** | Brief disconnect does not instantly kill camera encode |
| **Grace window (≈30–120s)** | F5 or Wi‑Fi blip → reconnect same user → streams **still warm** |
| **Layout restore** | Open cams, wall slots, map extent come back automatically (capped) |
| **Warn before unload** | Soft “you have live video — leave?” (not on every click) |
| **Prefer soft reconnect** | Socket.IO reconnect **without** F5 — train: don’t refresh for “stuck video” |

Axon / Genetec-class: refresh may briefly rebuild UI, but **subscriptions and layout** are not treated as disposable browser toys.

---

## Target for Ubitron (already named — not applied)

```
Today:     F5 → kill live + wipe layout → operator rebuilds
Enterprise: F5 → warn (optional) → grace keep streams → restore pins/FR watch
```

| Priority | MOB | Effect |
|----------|-----|--------|
| **P1** | **`mob-live-viewer-grace-disconnect`** | Disconnect does **not** stop BWC for ~90s if same operator reconnects |
| **P2** | **`mob-operator-session-restore`** | Remember open pins / wall / tab (≤8 live SOP); reopen staggered after load |
| **P3** | **`mob-fr-watch-session-restore`** | FR watch set + slots come back |
| **P4** | **`mob-refresh-guard-live`** | Opt-in leave warning when live video open (`FM_REFRESH_GUARD=1`) |

**SOP until then:** Prefer **Stop / restart that cam** or in-app recovery over F5. Refresh = last resort after deploy.

---

## What we will **not** promise

| Promise | Why not |
|---------|---------|
| Zero flicker forever with no server work | Impossible on pure SPA without grace + restore |
| Restore unlimited live cams on refresh | Fleet SOP: **8 live max** — restore must respect cap |
| Keep rail “Recent” tiles across F5 | Ephemeral by design; use ledger / Keep pack |

---

## Habit — suggested next

**Suggested next MOB (highest ROI):** `MOB-APPLY mob-live-viewer-grace-disconnect`  
Then `mob-operator-session-restore` so F5 is annoying, not catastrophic.

---

## No code in this DISC
