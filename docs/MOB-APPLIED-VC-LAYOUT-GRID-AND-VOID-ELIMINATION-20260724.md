# MOB APPLIED — VC-LAYOUT-GRID-AND-VOID-ELIMINATION

**Date:** 2026-07-24  
**FIX:** `MOB-FIX-VC-LAYOUT-GRID-AND-VOID-ELIMINATION`  
**Status:** APPLIED — operator PASS/FAIL pending  
**Cause:** Meeting still showed a dead black middle band and people feeds as an east–west bottom strip.

---

## Root cause

1. **Class clash:** Operations without share still stamped `vc-mode-operations` on the stage body. That CSS forces `.vc-gallery-grid { flex-direction: row }`, which overrode Speaker’s vertical side filmstrip and left an empty spotlight (black void) with tiles in a horizontal strip.
2. **Empty spotlight + strip tiles:** When no tile was in the spotlight pane, remaining height stayed black while people sat in the thin gallery strip.

## What we fixed

| Fix | Detail |
|-----|--------|
| Viewport fill | `#app-view-conference` / `#conference-panel` / stage chain: `flex: 1`, `min-height: 0`, column, `overflow: hidden` |
| Top chrome | Room / personnel / host tools stay `flex: 0 0 auto` (natural height) |
| Dock | Meeting dock stays `flex-shrink: 0` at bottom of stage |
| No ops clash | Split (no share): **Speaker chrome only** — do **not** add `vc-mode-operations` |
| Fill grid | If spotlight has no `.vc-tile` but gallery has tiles → `vc-mode-fill-grid`: responsive `repeat(auto-fit, minmax(320px, 1fr))`, tiles `aspect-ratio: 16/9`, media `object-fit: contain` |
| Speaker lock | Speaker (non-deploy) gallery stays **column** filmstrip even if ops class leaks |

## Files

- `public/index.html` (CSS + cache)
- `public/js/conference-layout.js` (ops class stamp + fill-grid)
- `public/js/vc-lazy.js` (cache)

**Cache:** `?v=20260724-vc-layout-grid-void-elim`

## Locked modes (unchanged)

Speaker / Operations / Focus stay. Grid is **only** the void/strip failure fallback and gallery fill — not a fourth default mode.

## Operator smoke

1. **Ctrl+F5** (required).  
2. Join VC.  
3. **PASS look:**
   - No giant black hole between room controls and bottom dock.
   - Video uses the middle of the screen (Speaker: big main + side strip; or multi-tile grid if no spotlight tile).
   - Not a single stretched east–west banner at the bottom.
4. Dock (Mic / Cam / Speaker / Operations / Focus / Leave) still at the bottom.

Say **PASS** or **FAIL**.
