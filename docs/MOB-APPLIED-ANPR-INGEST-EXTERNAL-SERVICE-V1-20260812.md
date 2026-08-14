# MOB-APPLIED ANPR-INGEST-EXTERNAL-SERVICE-V1

**Date:** 2026-08-12  
**Status:** APPLIED  
**Hatch:** `FM_ANPR_INGEST_EXTERNAL=0` → old in-process grab on Fleet (lab only)

---

## What you get (human)

- **Fleet server** no longer does plate grab/OCR on its main process (default).  
- **Separate window:** `START-ANPR-INGEST.bat` watches live streams using **URLs from Fleet** (no empty WVP mistake).  
- Python sidecar still: `START-ANPR.bat` (now also opens ingest).  
- 1-click ship builds `anpr-ingest-service.js` next to `run.js`.

---

## Files

| File | Role |
|------|------|
| `lib/anprLivePoller.js` | Control plane: watch slots + ingest-state + accept ticks |
| `lib/anprIngestServiceMain.js` | External grab/track/OCR service |
| `lib/anprLivePollerRuntime.js` | Shared runtime; pushed FLV for ingest worker |
| `START-ANPR-INGEST.bat` | Start ingest |
| `START-ANPR.bat` | Starts ingest helper window too |
| `server.js` | `/api/analytics/anpr/ingest-state` + `ingest-tick` (localhost) |
| ship builders | emit `anpr-ingest-service.js` |

---

## You do (PASS)

1. Restart **Fleet**.  
2. Run **`START-ANPR.bat`** (sidecar + ingest window).  
3. If ingest window alone: `START-ANPR-INGEST.bat`.  
4. Hard refresh → Live ANPR on a **live** cam.  
5. PASS = server stays up + plates/crops return.

**Cam must be live (WVP play)** or ingest-state has no FLV URL — no crop. Same as before.

---

## Next (not this MOB)

- `FR-POLLER` / Weapon same external-service blueprint  
- Concurrent smoke before pack
