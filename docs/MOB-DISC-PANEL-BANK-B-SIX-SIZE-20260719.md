# MOB DISC — Bank B (6–8) keep 6-panel slot size + blank below (NO APPLY)

**Status:** SUPERSEDED by APPLIED `MOB-APPLY-PANEL-BANK-B-MATCH-A-SIZE` (2026-07-19) — bank B = Bank A height (~1/5), not 1/6.  
**Subject:** `MOB-DISC-PANEL-BANK-B-SIX-SIZE`  
**Follows:** `MOB-APPLY-PANEL-WALL-5-PLUS-3-PAGES` (applied)  
**Scope:** Ops `#video-wall` **bank B only** (panels 6–8). Do not freestyle bank A / pin / SOS / PTT.

---

## What you mean (confirmed)

When on **Next Panels 6–8**:

1. **Do not** stretch the three panels into **full-height “big boxes”** that fill the whole right rail.
2. Each of panels **6 / 7 / 8** should be about the **same height as one panel in the old 6-panel wall** (“first round of 6 size”).
3. **Leave the bottom blank** for now — empty rail space under the three panels is OK. No need to fill it with UI, ads, or a fourth panel.

Yes — that reading matches.

---

## Why it looks wrong today

Bank A and bank B both use:

```css
.video-slot { flex: 1; … }
```

| Bank | Visible slots | Effect |
|------|---------------|--------|
| A (1–5) | 5 × `flex:1` | Share rail → each ~1/5 tall (taller than old 1/6 — intentional) |
| B (6–8) | 3 × `flex:1` | Share rail → each ~**1/3** tall → **huge** panels |

So bank B “eats” the whole column. You want bank B slots **capped** at ~**1/6 of rail height** (old six-up size), with **dead space under** them.

---

## Target look (bank B)

```
┌─ video-wall ─────────┐
│ Panels 6–8 | Next…   │
│ ┌ panel 6 ┐  ~1/6 H  │
│ ├ panel 7 ┤  ~1/6 H  │
│ ├ panel 8 ┤  ~1/6 H  │
│ │                 │  │
│ │   (blank)       │  │
│ │                 │  │
└──────────────────────┘
```

- Full chrome on 6–8 unchanged (play / stop / PTT / popout).
- Keep-live on tab flip unchanged.
- Auto-rotate unchanged.
- Blank bottom = **empty**, not a fake idle panel (unless you ask later).

---

## Proposed CSS approach (for later APPLY only)

When `#video-wall[data-bank="b"]` (or `.video-slot` in bank B visible set):

- Stop equal-stretch for those three: e.g. `flex: 0 0 auto` (or `flex: 0 0 calc((100% - gaps) / 6)`).
- Cap stage/slot height to roughly **one-sixth of `#video-wall-slots` height** (minus chrome/gaps), matching old 6-up geometry.
- `#video-wall-slots` stays `flex` column; leftover space simply stays empty (background of the rail).

Exact calc can be:

- `flex: 0 0 calc((100% - 2 * gap) / 6)` on each visible bank-B `.video-slot`, or  
- `max-height: calc(100% / 6)` on the slot/box,

whichever measures closest to old 6-panel panels after one Ops refresh check.

**Do not** change bank A (1–5) in this MOB unless you say so.

---

## Out of scope

- Filling the blank with map mini / FR / ads  
- Re-adding scroll  
- Cover crop  
- Changing SLOT_COUNT or tab labels  

---

## Suggested APPLY name (when ready)

**`MOB-APPLY-PANEL-BANK-B-SIX-SIZE`**

1. Bank B only: slot height ≈ old **1/6 rail**, not 1/3 fill.  
2. Blank space under panels 6–8 OK.  
3. Cache-bust CSS / hard refresh.  
4. No play/SOS/PTT logic changes.

---

## Status

**DISC only.** Waiting for **`MOB-APPLY-PANEL-BANK-B-SIX-SIZE`** (or your exact APPLY) before any edit.
