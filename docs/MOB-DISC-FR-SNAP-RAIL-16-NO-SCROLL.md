# MOB DISC — FR snap rail · 16 fit · no scroll · trim dev copy

**Status:** **APPLIED** 2026-07-11  
**Trigger:** Operator — vertical scrollbar on snapshot rail is unnecessary; fixed **16** snap slots should fill the column. Remove scaffold copy (“Snaps appear while watch is running”, watch/snaps jargon on the rail).  
**Search:** snap rail scroll, crop-rail, snapshot 16, cropEmpty, ax-fr-crop-rail  
**Related:** `MOB-DISC-FR-SNAP-RAIL-16-METADATA.md` (APPLIED), `MOB-DISC-FR-SNAP-RAIL-PROPORTION-GRID.md` (APPLIED)

---

## Verdict — you are right

The scrollbar is **not** an operator feature. It is a layout bug left over from the 8→16 expansion.

| What you see | Why |
|--------------|-----|
| Vertical scrollbar on the dark snapshot column | `.ax-fr-crop-rail { overflow: auto }` + **16** cells each forced to **4:3 aspect-ratio** → total height (~650px+) exceeds the rail column beside the live tile grid |
| “Snaps appear while watch is running.” | Dev empty-state hint (`#ax-fr-crop-empty`, `analytics.fr.cropEmpty`) — scaffolding from early rail MOBs |
| “Snapshot (16)” title | Useful during build; operators do not need a count label on a fixed grid |

**Ship rule:** **16 slots, no scroll, no dev hints** on the rail. Lightbox + match overlay stay.

---

## What stays

| Surface | Keep |
|---------|------|
| **16** fixed slots (2×8 grid) | Yes — `cropRailMax = 16` |
| Click thumb → lightbox + metadata | Yes |
| Match red border + badge | Yes |
| Newest-first insert order | Yes |
| Empty placeholder cells (`—`) | Yes — grid stability without hint text |

---

## Root cause (code)

```569:569:public/index.html
.ax-fr-crop-rail { flex: 1; min-height: 0; overflow: auto; ... }
```

```485:497:public/index.html
.ax-fr-crop-list { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.ax-fr-crop-card { aspect-ratio: 4 / 3; min-height: 0; ... }
```

`MOB-DISC-FR-SNAP-RAIL-16-METADATA.md` explicitly allowed scroll (“Rail may scroll on short screens — OK”). **Operator override:** that allowance is **revoked**.

```628:632:public/js/fr-alarm.js
'<p class="hint ax-fr-crop-empty" id="ax-fr-crop-empty">' +
esc(tr('analytics.fr.cropEmpty', 'Snaps appear while watch is running.')) +
'</p><div class="ax-fr-crop-list"></div>';
```

`syncCropRailEmptyHint()` toggles that paragraph — **remove** with the paragraph.

---

## Locked fix — one MOB

### A. Rail fits 16 without scroll

| Rule | Value |
|------|--------|
| Rail overflow | **`hidden`** (not `auto`) |
| Grid rows | **`grid-template-rows: repeat(8, minmax(0, 1fr))`** on `.ax-fr-crop-list` |
| Grid height | **`height: 100%`** / `flex: 1; min-height: 0` inside rail |
| Cell sizing | **Drop fixed `aspect-ratio` on cards** — let row height drive cell; keep `object-fit: contain` on images |
| Column width | Keep **240px** `ax-fr-right` unless soak FAIL → optional 260px (last resort) |
| Short viewports | Cells shrink proportionally — **no scrollbar** |

```
┌─ ax-fr-right (240px, full main height) ─┐
│ ┌─ ax-fr-crop-rail (overflow:hidden) ─┐ │
│ │ [optional quiet label]              │ │
│ │ ┌──┬──┐ 8 rows × 2 cols = 16       │ │
│ │ │  │  │  rows share height equally  │ │
│ │ └──┴──┘  no scroll                  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### B. Remove dev copy on rail

| Remove / change | Detail |
|-----------------|--------|
| `#ax-fr-crop-empty` paragraph | Delete DOM + `syncCropRailEmptyHint()` |
| `analytics.fr.cropEmpty` | Remove from `en.json` (or leave orphaned — prefer remove) |
| Title | **Option locked:** rename to **“Recent”** (`analytics.fr.snapshotRecent`) — no “(16)”, no “Snapshot” count jargon |
| `analytics.fr.snapshotGrid16` | Deprecate after rename |

**Not in this MOB:** watch roster copy, watchlist tab, `ax-fr-watch-hint` toast (separate if operator complains).

---

## MOB plan

| # | MOB | Delivers |
|---|-----|----------|
| **1** | **`mob-fr-snap-rail-16-fit`** | CSS grid fills column; `overflow: hidden`; 16 thumbs visible without scrollbar |
| **2** | **`mob-fr-snap-rail-copy-trim`** | Drop empty hint; quiet “Recent” label (or no title) |

**Locked:** Combine **#1 + #2** in a **single** MOB if you want one PASS — scope is still CSS + `fr-alarm.js` + `en.json` only.

---

## APPLY scope (combined MOB)

| File | Change |
|------|--------|
| `public/index.html` | `.ax-fr-crop-rail` overflow; `.ax-fr-crop-list` 8 equal rows; card height from grid; cache-bust if needed |
| `public/js/fr-alarm.js` | Remove empty hint DOM + `syncCropRailEmptyHint`; quieter title key |
| `public/locales/en.json` | Add `analytics.fr.snapshotRecent`; remove `cropEmpty` |

**Not in this MOB:** sidecar, ledger, live tiles, alert drawer, server.

---

## PASS checkpoint

1. Hard refresh → Analytics → Face live.  
2. Snapshot column shows **16** slots (filled or `—`) — **no vertical scrollbar**.  
3. No “Snaps appear while watch is running.” text.  
4. Title is **“Recent”** or absent — not “Snapshot (16)”.  
5. Resize window shorter → thumbs shrink; still **no scroll**.  
6. Click thumb → lightbox still works. Real match → red border still works.

---

## Apply command

```text
MOB-APPLY mob-fr-snap-rail-16-fit
```

(or `mob-fr-snap-rail-16-no-scroll` — same scope)

---

## FAQ

| Question | Answer |
|----------|--------|
| Why was scroll there? | 16× fixed 4:3 cells taller than column; `overflow: auto` showed a bar. |
| Do we go back to 8? | **No** — operator locked **16**; fix layout instead. |
| Will thumbs get tiny? | On very short screens, yes — still better than a scrollbar for a fixed contact sheet. |
| Watchlist / “watch set” copy? | Different feature — this MOB is **snapshot rail only**. |
