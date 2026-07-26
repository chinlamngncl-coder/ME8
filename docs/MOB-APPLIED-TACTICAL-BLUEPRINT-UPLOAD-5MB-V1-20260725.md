# MOB-APPLIED — Phase 2 Task 2.2 Secure blueprint upload

**Date:** 2026-07-25  
**Task:** Phase 2 **2.2** — `POST /api/tactical/blueprints/upload`  
**Operator:** **PASS** (2026-07-25) — restart + BWC video OK  
**Disc:** `MOB-DISC-TACTICAL-BLUEPRINT-SCHEMA-UV-20260724.md`

## Delivered

| Piece | Detail |
|-------|--------|
| Multer | 5 MB max; MIME jpeg/png/webp; filename = `crypto.randomUUID()` + ext (never `originalname`) |
| Disk gate | `requireStorageFreeDiskSpace` on `STORAGE_DIR` (507 if &lt; 5 GB free) |
| Auth | `dashboardAuth.requireSuperAdmin` (+ global dashboard session) |
| Dimensions | `lib/imageDimensions.js` (JPEG/PNG/WebP headers — **no sharp** dependency) |
| DB | `siteDb.insertTacticalBlueprint` → `tactical_blueprints` |
| Serve | `GET /media/tactical-blueprints/*` (static under storage) |
| Bonus | `GET /api/tactical/blueprints` list (super-admin) |

**Files:** `server.js`, `run.js` (rebuilt), `lib/siteDb.js`, `lib/imageDimensions.js`  
**Verify:** `npm run verify:tactical-blueprint-upload`

### Example request

```http
POST /api/tactical/blueprints/upload
Authorization: (dashboard session cookie)
Content-Type: multipart/form-data

file=<image>
name=Building A Floor 1   (optional)
```

### Example response

```json
{
  "ok": true,
  "blueprint": {
    "id": "…uuid…",
    "name": "Building A Floor 1",
    "imageUrl": "/media/tactical-blueprints/….jpg",
    "originalWidth": 1920,
    "originalHeight": 1080,
    "mimeType": "image/jpeg",
    "byteSize": 123456
  }
}
```

## Operator smoke (plain)

1. Restart lab  
2. Open a BWC — **video like before = PASS**

(No new upload button in the UI yet — that is a later overlay task.)

Say **PASS** or **FAIL**. Do **not** start Task 2.3 until PASS.
