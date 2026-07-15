# MOB DISC — Subject matches: toolbar chip row (not a full-width destroyer)

**Status:** **APPLIED 2026-07-13** — `mob-fr-hits-toolbar-chips`  
**Placement:** toolbar **far right** (`margin-left: auto`) — not required next to Load video  
**Label:** short **Matches** · 5×44px chips · Recent **16** restored  
**Date:** 2026-07-13  
**Trigger:** Fix full-width bar destroyer; operator: go as far right as possible  
**Related:** rejected full-width `mob-fr-hits-top5-bar` chrome

---

## Got it

| Wrong (what we applied) | Right (locked now) |
|-------------------------|--------------------|
| Fat **Subject matches** strip across the whole Face panel | **Compact** row in the **toolbar**, beside **Load video** |
| Long heading + subtitle eating height | **Short** label only (e.g. **Matches**) |
| Recent cut to **12** / 2×6 | Recent **unchanged** — back to **16** / 16-fit as before |
| Tiles / watch list visually crushed | Live grid + Recent **untouched** |

**Do not** keep the applied full-width `#ax-fr-hits-bar` between toolbar and `.ax-fr-main`.

---

## Placement (concrete) — APPLIED

```
[ hint ] [ threshold ] [ Load video ] … [lab]     ………  Matches [h1][h2][h3][h4][h5] (+N)
                                                      ↑ far right (margin-left: auto)
```

Not required adjacent to Load video — pushed **as far right as possible** in the toolbar.

---

## What “rest remain the same” means

| Piece | After fix MOB |
|-------|----------------|
| 6 live tiles | As before |
| Recent 16-fit | **Restore** `cropRailMax = 16`, CSS `repeat(8, …)` |
| Toolbar controls | Unchanged order except insert compact Matches group |
| Alert toast / drawer | Unchanged |
| Match routing logic | Keep (match → Matches chips; rolling → Recent) — only **DOM home** moves |

---

## MOB to apply when ready

| MOB | Does |
|-----|------|
| **`mob-fr-hits-toolbar-chips`** | Revert full-width bar; restore Recent 16; put 5 snapshot-sized chips beside Load video; short **Matches** label |

Parked / superseded layout id: full-width `mob-fr-hits-top5-bar` chrome (logic idea kept; placement rejected).

```text
MOB-APPLY mob-fr-hits-toolbar-chips
```

---

## Bottom line

Full-width Subject matches bar = **UI destroy** — agreed.  
Next: **toolbar chips beside Load video**, same size as Recent slots, Recent 16 restored.
