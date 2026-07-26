# MOB-APPLIED — VC-14-STREAM-ENTERPRISE-LAYOUTS-V2

**Date:** 2026-07-24  
**APPLY:** `MOB-APPLY VC-14-STREAM-ENTERPRISE-LAYOUTS-V2`

## Goal

Rewrite VC layout chrome for **14 streams (8 humans + 6 BWC/fixed)** across **5 mission modes**, kill dead vertical void, keep **16:9 `object-fit: contain`** (no east–west stretch). LiveKit join/track attach unchanged.

## Caps

| Cap | Value |
|-----|-------|
| Humans | 8 |
| BWC / fixed ingress | **6** (`lib/conferenceStore.js`, hub default) |
| LiveKit `max_participants` | **20** (`docker/livekit.yaml`) |
| Sidebar / filmstrip | up to 13 rest streams |

## Five maps

| Mode | Class | Structure |
|------|-------|-----------|
| Speaker | `.layout-speaker` | Main stage + right sidebar ~260px |
| Operations | `.layout-operations` | Top 3-col BWC grid + bottom human strip ~180px |
| Gallery | `.layout-gallery` | Equal `auto-fit` grid (minmax 280px) |
| Focus | `.layout-focus` | One full-bleed stream (Exit Focus / Esc kept) |
| Dual | `.layout-dual` | Two main stages + right sidebar |

## Files

- `public/js/conference-layout.js` — mission chrome + remount maps
- `public/js/conference-hub.js` — default `maxBwcIngress` 6
- `public/js/vc-lazy.js` — cache `?v=20260724-vc-14-stream-enterprise-layouts-v2`
- `public/index.html` — dock Gallery/Dual + V2 CSS
- `public/locales/en.json`, `zh.json` — mission labels
- `lib/conferenceStore.js` — `MAX_BWC_INGRESS = 6`
- `docker/livekit.yaml` — `max_participants: 20`
- `scripts/verify-vc-14-stream-enterprise-layouts-v2.js`

## Operator check

1. Restart ME8 / LiveKit if room cap was still 12.
2. Open VC → **Ctrl+F5**.
3. Join with people + BWC/fixed (up to 8+6).
4. Click each dock layout: Speaker / Operations / Gallery / Focus / Dual.
5. PASS if: no big black void between chrome and dock; tiles keep 16:9 (not stretched flat); Focus has Exit Focus; dock stays at bottom.

## Verify

```text
node scripts/verify-vc-14-stream-enterprise-layouts-v2.js
```
