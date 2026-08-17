# MOB-DISC — Route & GPS: fill the page when idle, scroll only when content grows

**Date:** 2026-08-17  
**APPLY (when operator says go):** `MOB-APPLY ROUTE-GPS-FILL-THEN-SCROLL-V1`  
**Scope:** CSS only (`public/css/global.css` + matching `index.html` `.rt-layout` / `#rt-map`). No APIs. No `route-trace.js`.

## What is wrong (from the operator)

After `ROUTE-GPS-NO-CLIP-SCROLL-V1`, the tab **scrolls even when nothing is loaded**. That is wrong.

Idle Route & GPS (no BWC trace) should feel like **one page**: map + empty video + empty telemetry + Case File ID + Attach, all on screen, **no scrollbar**.

Scroll is only allowed when a loaded trace **adds words/rows** and the telemetry card actually grows past the page.

## Why it scrolls when empty (locked)

Not laziness in the last APPLY — the last APPLY did what it was told: never clip. It also left two rules that **always** make the page taller than the window, even with dashes:

1. Map **`min-height: 650px`** — forced, even if the leftover Evidence area is shorter.
2. Right column: **16:9 video** (`max-height: 28vh`) + Trim + full telemetry card, with **`align-items: start`**, so the stack is tall and the map does not share leftover height.

Empty telemetry is still a tall card. 650px map + that stack = scrollbar with nothing to investigate.

## Locked behaviour after APPLY

| State | Scrollbar | Layout |
|---|---|---|
| No trace loaded (dashes, empty Case ID) | **None** | One page. Map fills leftover height on the left (2.5). Video + telemetry + Attach fully visible on the right (1). |
| Trace loaded, extra stats / SOS / point list / messages | **Yes, only then** | Same grid. Card grows. Evidence hub scrolls. Nothing clipped. Attach stays in the card. |

Keep **2.5fr / 1fr** and **24px** gap.

## Exact CSS intent (APPLY)

- `#ev-panel-route-trace`: fill leftover hub (`flex: 1 1 auto; min-height: 100%` of `#evidence-panel`), **`height: auto`** so it can grow past fill.
- `#evidence-panel` stays `overflow-y: auto` (scroll **only** if content > fill).
- `.rt-layout`: keep 2.5 / 1; **`align-items: stretch`**; `flex: 1 1 auto`; `overflow: visible`. Layout `min-height` = leftover after the toolbar (fill), not a fake 650px.
- **Drop map `min-height: 650px`.** Map pane + `#rt-map`: `height: 100%; min-height: 0`; `border-radius: 8px; overflow: hidden` **on the map only** (Leaflet clip, not page clip).
- Video stage: **smaller cap** so idle telemetry + Case ID + Attach fit on one page (replace 16:9 / 28vh with a modest cap, e.g. **180px** max). Playing video still uses that stage.
- `.rt-pane-video` + `.rt-telemetry-card`: `overflow: visible; height: auto`. Point list (if shown) keeps **internal** `max-height` + `overflow: auto`.

Do **not** go back to `overflow: hidden` on the hub — that was the cutoff bug.

## Operator PASS

1. Hard refresh. Evidence → Route & GPS. **Do not** load a trace.
2. PASS idle: no page scrollbar. Full map. Full telemetry including Case File ID and Attach Trace to Case.
3. Load a trace that fills distance/speed (and extra lines if any). PASS: if the card is taller than the window, **then** the page scrolls; Attach is not chopped.

## Out of scope

Storage path mask, Evidence tab IDs, Leaflet servers, backend.
