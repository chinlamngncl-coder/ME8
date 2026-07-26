# MOB-APPLIED — Phase 2 Task 2.3 PTZ AR split-screen

**Date:** 2026-07-25  
**Task:** Phase 2 **2.3** — Left map / right PTZ AR glass + UV pins  
**Operator:** **PASS** (2026-07-25) — split UI without PTZ (`MOB-DISC-SEC-2-3-PTZ-AR-TEST-WITHOUT-PTZ-20260725.md`)  
**Words follow-on:** `MOB-DISC-TACTICAL-ROOF-VIEW-OPERATOR-WORDS-20260725.md`  
**Roadmap:** `MOB-DISC-ARCHITECT-MASTER-ROADMAP-20260725.md`

## What you get

| Piece | Detail |
|-------|--------|
| Layout | Tactical stage: **left map**, **right PTZ AR pane** (`has-ar-split`) |
| Glass | `#ax-tactical-ar-glass` over the live video stage |
| UV math | `left: (uv_x * 100)%`, `top: (uv_y * 100)%` — resize-stable |
| Preset lock | Pins + floating bubbles **only** when a preset is locked |
| Unlock | Manual PTZ pan/tilt/zoom (or cam/preset change) → pins **hide** |
| Live hook | Same FLV path as POI: `zlm/start` → `Me8LivePlayerFactory.attachFlvPrimary` |
| ONVIF | `GET /api/fixed-cams/:id/ptz/presets` · `POST …/ptz` action `goto-preset` |

**Files:** `public/js/tactical-ar.js`, `tactical-shell.js`, `index.html`, `css/global.css`, `server.js` (+ `run.js` rebuild)  
**Verify:** `npm run verify:tactical-ptz-ar`  
**Cache:** `?v=20260725-tactical-ptz-ar-split-v1`

### Feed pins into the glass (until DB pin CRUD UI exists)

```js
TacticalAr.setPins([
  { name: 'North Gate', uv_x: 0.42, uv_y: 0.55, presetToken: 'P001', device_id: '…' },
]);
```

`presetToken` must match the locked ONVIF preset token (or leave empty to show on any lock).

## Operator smoke (plain)

**Disc:** `MOB-DISC-SEC-2-3-PTZ-AR-TEST-WITHOUT-PTZ-20260725.md`

**You do not need a PTZ to PASS.**

1. **Ctrl+F5**  
2. Tactical → **PTZ AR split** → map left / panel right  
3. **Close AR**  
4. Ops BWC video still OK → **PASS**

Full preset/pin AR needs a real ONVIF PTZ later — not required for this PASS.

Say **PASS** or **FAIL**. Do **not** start Phase 3 until PASS.
