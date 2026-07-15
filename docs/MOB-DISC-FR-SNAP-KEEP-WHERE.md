# MOB DISC — Where is a “Kept” snapshot?

**Status:** DISC only — **no APPLY**  
**Date:** 2026-07-13  
**Trigger:** After `mob-fr-snap-keep-card` — “if we kept the snapshot, where is it?”  
**Search:** Keep, fr-snap-kept, snap ledger, where stored  
**Related:** `MOB-DISC-FR-SNAP-FLOAT-KEEP-MAP.md`, `MOB-DISC-FR-HALF-FACE-SNAP-LEDGER.md`

---

## Short answer

| “Keep” you clicked | Where it is |
|--------------------|-------------|
| **Keep button** (today) | **On screen only** — floating card `#fr-snap-kept` (usually **lower-left**). Not a folder. Lost on **hard refresh / restart**. |
| **Automatic FR ledger** (already exists) | **On disk** — `storage/fr-snap-ledger/` — **every** good snap (not only Keep) |

**Keep ≠ save to disk.** Keep = “pin this card for me while I work.”

---

## What you should see after Keep

```
Screen
  ├── Snap float (right) — temporary open from rail; × closes it
  └── Kept card (left, cyan bar “Kept · …”) — stays across Analytics ↔ Ops
```

If you don’t see it: hard-refresh needed for the new JS; or it was minimized to a thin bar; or × dismissed it; or another Keep replaced it (one slot only).

---

## Two different “keeps” (do not mix)

```
Rail snap ──Open──► float card ──Keep──► pinned UI card (#fr-snap-kept)
     │
     └── (always, server) ──► storage/fr-snap-ledger/  (forensic archive)
```

| Layer | Purpose | Survives refresh? | Operator UI today |
|-------|---------|-------------------|-------------------|
| **Kept card** | Working memory while dispatching | **No** | Floating panel |
| **Snap ledger** | Forensic list of crops + GPS + cam | **Yes** | API mainly; list UI still parked (`mob-fr-snap-ledger-ui`) |

So: “Where is my Keep?” → **still on the glass**, left side.  
“Where are all faces we captured?” → **`storage/fr-snap-ledger/`** (+ `GET /api/analytics/fr/snaps`).

---

## If you meant “save forever when I click Keep”

That is **not** built yet. Named options:

| MOB | What it does |
|-----|----------------|
| **`mob-fr-snap-keep-persist`** | Keep also flags/writes that snap into a “starred” set (or copies into a keep folder) + reload after refresh |
| **`mob-fr-snap-ledger-ui`** | Browse ledger in Analytics (find any snap later without Keep) |

**Suggested next (if that’s the pain):** say whether you want  
**(A)** Keep survives refresh, or  
**(B)** a ledger browser for all snaps, or both.

---

## Habit — suggested next

**Suggested next:** Confirm you can see the **left cyan “Kept”** bar after Keep. If you need it after refresh → `MOB-APPLY mob-fr-snap-keep-persist`. If you need a history list → `MOB-APPLY mob-fr-snap-ledger-ui`.

---

## No code in this DISC
