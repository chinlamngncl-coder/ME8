# MOB-APPLIED — Panel 16:9 full-width fit five · flexible res (2026-07-19)

**APPLY:** `MOB-APPLY-PANEL-16x9-FULL-WIDTH-FIT-FIVE`  
**Also locks:** flexible 720 / 1080 / 4K (scale into box; no frozen pixel size)

## Done

1. **Width-first** stage: prefer full panel width, height from stream AR (default 16:9).  
2. If five don’t fit → shrink **whole** AR box (W+H), still correct shape.  
3. Panel **box bg transparent** — no fake black bars beside a small video island.  
4. Head stays **full rail width** (buttons).  
5. AR from `videoWidth/videoHeight` when live (720/1080/4K); re-fit on metadata.  
6. **contain** — scale any res into the box; no stretch-to-death.  
7. Pin / Call / PTT / SOS untouched.

## You

Hard refresh → panels 1–5 fit, heads OK, **no thick black sides** beside picture → pass/fail.
