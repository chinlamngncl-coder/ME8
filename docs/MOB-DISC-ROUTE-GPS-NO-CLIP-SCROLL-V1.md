# MOB-DISC — Route & GPS: stop clipping map + telemetry

**Date:** 2026-08-17  
**APPLY (when operator says go):** `MOB-APPLY ROUTE-GPS-NO-CLIP-SCROLL-V1`  
**Scope:** CSS only (`public/css/global.css` + matching `index.html` `.rt-layout` / `#rt-map` rules). No APIs. No `route-trace.js` unless Leaflet tiles fail to fill after unlock (then one `invalidateSize` on panel show).

## What the screenshot actually shows

The **2.5 / 1** columns are already on. That last grid patch worked.

What did **not** work: the **bottom is cut off**.

- Map: OpenStreetMap credit sits on the knife-edge of the pane.
- Right column: Case File ID is half-visible. The blue **Attach Trace to Case** button is a sliver. That is not “too little data” — the rest of the card is below the clip line.

If a loaded trace fills distance / speed / SOS audit / point list, **yes — it will be forced down and cut off worse**, because the clip is a hard viewport lock, not a missing min-height.

## Root cause (locked, do not invent)

Route & GPS was built as a **viewport-locked dual-pane** that **forbids scroll**:

1. When this tab is open, `#evidence-panel { overflow: hidden }`.
2. `#ev-panel-route-trace` is `height` + `max-height: calc(100vh - 168px)` and `overflow: hidden`.
3. `.rt-layout`, `.rt-pane-video`, and `.rt-telemetry-card` are also `overflow: hidden`.

Then we added **map `min-height: 650px`** and `align-items: start`. The grid is now **taller than the locked box**. Hidden overflow **slices** both columns. The right stack (16:9 video + Trim + telemetry + Case ID + Attach) is taller than the leftover viewport under the toolbar.

This is layout, not map JS.

## Locked product behaviour after APPLY

- Keep **2.5fr / 1fr** and **24px** gap. Map stays the wide left column.
- **Do not** clip the page. Evidence hub **may scroll** on this tab so map credit, telemetry stats, Case File ID, and **Attach Trace to Case** are fully on screen (scroll if the window is short).
- Map pane keeps rounded clip **inside itself** (Leaflet only). Do not clip the whole hub.
- Telemetry **card** grows with content (`overflow: visible`). A long GPS **point list** (if shown) scrolls **inside the list**, not by hiding the Attach button.

## Exact CSS intent (APPLY)

- Remove / override the `html:has(...#ev-panel-route-trace...) #evidence-panel { overflow: hidden }` lock → `overflow-y: auto`.
- `#ev-panel-route-trace`: `height: auto; max-height: none; overflow: visible`.
- `.rt-layout`: keep `2.5fr 1fr`, `overflow: visible`.
- `.rt-pane-video` + `.rt-telemetry-card`: `overflow: visible; height: auto; flex: none`.
- Map: keep `min-height: 650px` + `border-radius: 8px; overflow: hidden` **on the map pane only**.

## Operator PASS

1. Hard refresh. Evidence → Route & GPS.
2. **Without** loading a trace: full map (attribution not sliced). Full telemetry card including Case File ID **and** Attach Trace to Case.
3. **Load trace** on a BWC with GPS. Distance / speed fill in. Still no cutoff. If a point list appears, that list may scroll; Attach stays visible.
4. Narrow window: page scrolls; nothing is chopped by a hidden overflow.

## Out of scope

Backend, Leaflet tile servers, Storage path mask, Evidence tab IDs.
