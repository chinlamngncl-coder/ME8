# MOB DISC — Stop video vs Stop all (FR Face watch)

**Status:** APPLIED `mob-fr-stop-video-selected` (2026-07-13)  
**Date:** 2026-07-13  
**Trigger:** Operator: Stop video stops everything when many are live; should stop **selected** tile/BWC only; stopped must **not** return on rotate; can select another to replace.  
**Was:** `public/js/fr-live-watch.js` — **Stop video** → `stopWatch()` (kills **all** tiles).  
**Now:** click live tile (focus ring) → **Stop video** / tile **×** → remove that cam from watch set (no rotate return); free slot fills when you check another BWC (or from remaining pool). **Stop all** unchanged.

---

## Plain answer

**You’re right — current Stop video is stupid.**

| Button | Today (broken UX) | Should be |
|--------|-------------------|-----------|
| **Stop video** | Stops **every** live tile (same as “end watch”) | Stop **focused / checked** live BWC(s) only |
| **Stop all** | Stop all video + clear watch set | Keep — nuclear stop + clear set |
| **Clear** | Clear selection (confirms if watching) | Keep |
| Tile **×** | Stops that slot | Keep; align with Stop video rules |

With **2/6 live**, clicking Stop video should **not** blank both unless both were targeted.

---

## Locked operator model

1. **Select** target(s): click a **live tile** (focus) and/or roster **checkbox**.  
2. **Stop video** → tear down **only those** streams; remove them from the **rotate/watch pool** so polling **does not bring them back**.  
3. Slot becomes free → pick another BWC → **Start watch** / auto-fill can place the new one on a free tile.  
4. **Stop all** → stop every live tile + clear watch set (confirm).  

**Pin** still means “hold this cam on a tile while rotating others” — separate from stop.

---

## Why it feels broken today

```text
Stop video  →  stopWatch()  →  watching=false, all slots stopped
Stop all    →  stopWatch() + selected=[]
```

So **Stop video ≈ Stop all without clearing the roster checkboxes** — useless distinction, and worse: it looks like “stop selected” but nukes the wall.

Rotate (`rotateOnce`) only swaps **unpinned** slots among `selected`. If Stop video does not **remove from `selected`** (or mark excluded), a “stopped” cam can return on the next rotate — exactly what you don’t want.

---

## Target behavior (detail)

| Action | Live streams | Watch set (`selected`) | Rotate |
|--------|--------------|------------------------|--------|
| **Stop video** (tile focused or roster checked that are live) | Stop those cams | **Remove** those ids from set (or soft-exclude — prefer **remove**) | Must not re-queue them |
| **Stop video** with nothing focused/checked | No-op + short hint: “Select a live tile or BWC first” | Unchanged | Unchanged |
| **Stop all** | Stop all | Clear set + pins | Off |
| Tile **×** | Stop that slot’s cam | Remove that cam from set | Same as Stop video for one |

Multi-select: if 2 roster boxes checked and both live → Stop video stops both; other live tiles stay.

---

## MOB

```text
MOB-APPLY mob-fr-stop-video-selected
```

**Touches:** `public/js/fr-live-watch.js` (+ copy in `en.json` if hints change).  
**Risk:** Low–Medium (FR tiles only; not Ops wall / PTT).  
**Checkpoint:** Start 2 live → focus one → Stop video → only that tile dies → wait rotate cycle → dead cam stays out → select third → fills free slot.

---

## Out of scope

- Engine match quality / 70% bar  
- Recent scored-only rail  
- Renaming buttons unless needed for clarity (“Stop selected”)

Optional later rename: **Stop video** → **Stop selected** if still ambiguous.

---

## Bottom line

Stop video today = stop all (bad).  
Locked: **stop selected/focused only + stay out of rotate + free slot for replacement.**
