# MOB-APPLIED: mob-evidence-redact-auto-preview-slim-v1

**Date:** 2026-07-16  
**Status:** APPLIED  
**Operator:** Auto preview only — fewer boxes, no Start/End typing for Auto rows.

## Intent

Stop Auto face-follow from dumping ~90 region rows with Start/End fields. Preview is for **look + delete bad**, not data entry. Save still runs per-frame face-follow burn (unchanged this MOB).

## What changed

| File | Change |
|------|--------|
| `lib/faceRedactRegions.js` | Cap default **10** previews; time-spread; tighter size gate |
| `server.js` autoface | Passes `maxRegions: 10`, pad `0.10` |
| `public/js/evidence-hub.js` | Auto rows: tag + ✕ only (no Start/End/Whole) |
| `public/locales/en.json` | Plain hint: look → delete if needed → Save (no Start/End) |
| `public/index.html` | Cache `?v=20260716-redact-preview-slim` |

## Explicitly NOT changed

- Face-follow **burn** on Save (still can be slow on long clips — later MOB)
- Note / finalize panel
- Detector (Seeta stays)
- Live / SIP / wall

## Operator check (plain)

1. Restart **UbitronC2** if the server was already running (so Node picks up `faceRedactRegions` / `server.js`).
2. Hard refresh the dashboard once.
3. Evidence → Redact → **Auto face-follow**.
4. Expect a **small** list of previews (about ten or fewer), **no** Start/End boxes to fill for those rows.
5. Delete bad yellow boxes if needed → **Save**.

## Related

- Quality / “blur everything” still a separate issue if burn is too wide — not this MOB.
- Next optional: `mob-evidence-redact-save-progress-v1` (Save hang).
