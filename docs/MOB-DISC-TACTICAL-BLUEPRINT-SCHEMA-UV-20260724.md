# MOB DISC — Tactical Blueprint schema + UV coordinates (Phase 1.5 / T2 foundation)

**Date:** 2026-07-24  
**Status:** **DISC / ARCHITECT LOCK** — schema Task **2.1 APPLIED** 2026-07-25 (`MOB-APPLIED-TACTICAL-BLUEPRINT-SCHEMA-UV-V1-20260725.md`). Upload / UV helpers = Task **2.2**.  
**Context:** Architect briefing confirmed today’s Tactical COP is Leaflet lat/lng + `localStorage` POIs. Enterprise SSOT requires **PostgreSQL** + **normalized UV** for floor-plan overlays (T2).  
**Operator ask:** Phase 1.5 — schema, upload route (5 MB / MIME), `calculateUvCoordinates`, UV clamp.

---

## Queue honesty (do not derail)

| Now | Next (locked earlier) | This Phase 1.5 |
|-----|----------------------|----------------|
| Finish Tactical pin mount smoke | **SEC Google five** (beats Turf) | Blueprint schema — **paper ready**; APPLY only when you open Tactical T2 / after SEC unless you override |

**Recommended APPLY name when you open it:**

`MOB-APPLY TACTICAL-BLUEPRINT-SCHEMA-UV-UPLOAD-V1`

Optional follow-on (UI overlay + pin drop on image):

`MOB-APPLY TACTICAL-SITE-IMAGE-OVERLAY-UV-PINS-V1`

---

## 1) Database schema (PostgreSQL)

Preferred path for this repo: SQL migration under `db/migrations/` (same style as `001_catalog_primary.sql`), wired through existing `siteDb` when APPLY lands. No ORM required.

```sql
-- 002_tactical_blueprint_uv.sql  (APPLY later — do not run until MOB-APPLY)

CREATE TABLE IF NOT EXISTS tactical_blueprints (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id         TEXT NOT NULL DEFAULT 'default',
    name            TEXT NOT NULL,
    image_url       TEXT NOT NULL,          -- server-relative path under storage (never client path)
    original_width  INTEGER NOT NULL CHECK (original_width > 0),
    original_height INTEGER NOT NULL CHECK (original_height > 0),
    mime_type       TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    byte_size       INTEGER NOT NULL CHECK (byte_size > 0 AND byte_size <= 5242880),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tactical_blueprints_site
    ON tactical_blueprints (site_id);

CREATE TABLE IF NOT EXISTS tactical_pins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id         TEXT NOT NULL DEFAULT 'default',
    name            TEXT NOT NULL DEFAULT '',
    -- NULL = pin lives on global geographic Leaflet map only
    blueprint_id    UUID NULL REFERENCES tactical_blueprints(id) ON DELETE SET NULL,
    -- BWC or fixed camera id (Fleet device / fixed cam catalog)
    device_id       TEXT NULL,
    -- Global map (WGS84). Nullable if pin is blueprint-only.
    lat             DOUBLE PRECISION NULL CHECK (lat IS NULL OR (lat >= -90 AND lat <= 90)),
    lng             DOUBLE PRECISION NULL CHECK (lng IS NULL OR (lng >= -180 AND lng <= 180)),
    -- Blueprint UV (normalized). Nullable if geo-only.
    -- Origin: top-left of image = (0,0); bottom-right = (1,1).
    uv_x            DOUBLE PRECISION NULL CHECK (uv_x IS NULL OR (uv_x >= 0 AND uv_x <= 1)),
    uv_y            DOUBLE PRECISION NULL CHECK (uv_y IS NULL OR (uv_y >= 0 AND uv_y <= 1)),
    notes           TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT tactical_pins_placement_chk CHECK (
        (lat IS NOT NULL AND lng IS NOT NULL)
        OR (blueprint_id IS NOT NULL AND uv_x IS NOT NULL AND uv_y IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_tactical_pins_blueprint
    ON tactical_pins (blueprint_id);
CREATE INDEX IF NOT EXISTS idx_tactical_pins_device
    ON tactical_pins (device_id);
CREATE INDEX IF NOT EXISTS idx_tactical_pins_site
    ON tactical_pins (site_id);
```

### Field map (Architect Q&A)

| Entity | Field | Role |
|--------|-------|------|
| Blueprint | `image_url` | Path to uploaded floor plan on server storage |
| Blueprint | `original_width` / `original_height` | Intrinsic pixel size at upload (aspect + UV sanity) |
| Pin | `blueprint_id` | **NULL** → global geo map; set → belongs on that floor plan |
| Pin | `device_id` | Linked BWC / fixed cam |
| Pin | `lat` / `lng` | Leaflet geographic placement |
| Pin | `uv_x` / `uv_y` | **0.0–1.0** fraction of blueprint width/height |

---

## 2) Coordinate math (frontend) — why resolution-independent

**Do not store screen pixels.** Store **UV** = fraction of the **image overlay’s geographic bounds** (which Leaflet scales to any screen).

When Super Admin drops a pin on a 4K monitor and a guard opens the same blueprint on 1080p:

1. Same `uv_x` / `uv_y` in Postgres  
2. At render time:  
   `lng = west + uv_x * (east - west)`  
   `lat = north + uv_y * (south - north)`  
   (with Leaflet `ImageOverlay` bounds; Y often increases downward in UV while lat decreases southward — see function comments)  
3. Screen CSS pixels never enter the database  

### `calculateUvCoordinates(dropEvent, imageBounds)`

```js
/**
 * Convert a Leaflet pointer event on a blueprint ImageOverlay into normalized UV.
 * @param {L.LeafletMouseEvent} dropEvent - event from map/overlay click or dragend
 * @param {L.LatLngBounds} imageBounds - overlay.getBounds() at drop time
 * @returns {{ uv_x: number, uv_y: number }} values clamped to [0, 1]
 *
 * UV convention (locked):
 *   uv_x = 0 at west (left), 1 at east (right)
 *   uv_y = 0 at north (top of image), 1 at south (bottom of image)
 */
function calculateUvCoordinates(dropEvent, imageBounds) {
    if (!dropEvent || !dropEvent.latlng || !imageBounds || !imageBounds.isValid()) {
        throw new Error('calculateUvCoordinates: need latlng + valid imageBounds');
    }

    const ll = dropEvent.latlng;
    const west = imageBounds.getWest();
    const east = imageBounds.getEast();
    const north = imageBounds.getNorth();
    const south = imageBounds.getSouth();

    const spanX = east - west;
    const spanY = north - south; // positive when north > south (normal)

    if (!Number.isFinite(spanX) || !Number.isFinite(spanY) || spanX === 0 || spanY === 0) {
        throw new Error('calculateUvCoordinates: degenerate imageBounds');
    }

    // Raw fraction of overlay bounds (may be slightly outside if drag overshoots)
    let uv_x = (ll.lng - west) / spanX;
    let uv_y = (north - ll.lat) / spanY; // top→bottom

    // Boundary lock — never persist outside the blueprint
    uv_x = Math.min(1, Math.max(0, uv_x));
    uv_y = Math.min(1, Math.max(0, uv_y));

    // Stable 4-decimal storage (matches schema intent)
    return {
        uv_x: Math.round(uv_x * 10000) / 10000,
        uv_y: Math.round(uv_y * 10000) / 10000,
    };
}

/** Inverse: UV → LatLng for rendering on any screen size */
function latLngFromUv(uv_x, uv_y, imageBounds) {
    const x = Math.min(1, Math.max(0, Number(uv_x)));
    const y = Math.min(1, Math.max(0, Number(uv_y)));
    const west = imageBounds.getWest();
    const east = imageBounds.getEast();
    const north = imageBounds.getNorth();
    const south = imageBounds.getSouth();
    return L.latLng(
        north - y * (north - south),
        west + x * (east - west)
    );
}
```

**Clamp rule:** every dragend / drop path must run through `calculateUvCoordinates` (or clamp again before `PUT`); never write UV outside `[0,1]`.

---

## 3) Upload route (multer) — 5 MB + MIME allowlist

**Planned route (APPLY later):** `POST /api/tactical/blueprints/upload`  
Auth: dashboard session + role capable of Tactical admin (same pattern as other mutate routes).  
Storage: under `STORAGE_DIR/tactical-blueprints/` (or siteDb-managed path), **UUID filename**, not `originalname`.

```js
// Sketch for MOB-APPLY — not live until APPLY
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');

const TACTICAL_BP_MAX_BYTES = 5 * 1024 * 1024; // 5 MB hard
const TACTICAL_BP_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const tacticalBpDir = path.join(STORAGE_DIR, 'tactical-blueprints');
fs.mkdirSync(tacticalBpDir, { recursive: true });

const tacticalBpStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, tacticalBpDir),
    filename: (_req, file, cb) => {
        const ext = file.mimetype === 'image/png' ? '.png'
            : file.mimetype === 'image/webp' ? '.webp' : '.jpg';
        cb(null, crypto.randomUUID() + ext);
    },
});

const tacticalBpUpload = multer({
    storage: tacticalBpStorage,
    limits: { fileSize: TACTICAL_BP_MAX_BYTES, files: 1 },
    fileFilter: (_req, file, cb) => {
        if (!TACTICAL_BP_MIME.has(file.mimetype)) {
            return cb(new Error('Only JPEG, PNG, or WebP blueprints allowed'));
        }
        cb(null, true);
    },
});

// Optional: reuse SEC free-disk middleware when that MOB lands
app.post(
    '/api/tactical/blueprints/upload',
    requireDashboardAuth,           // existing session gate
    // requireFreeDiskSpace,        // after SEC-EVIDENCE-UPLOAD-FREE-DISK-V1
    tacticalBpUpload.single('file'),
    async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ ok: false, error: 'file required' });
            if (req.file.size > TACTICAL_BP_MAX_BYTES) {
                try { fs.unlinkSync(req.file.path); } catch (_) {}
                return res.status(400).json({ ok: false, error: 'Blueprint exceeds 5 MB' });
            }
            const name = String((req.body && req.body.name) || '').trim() || 'Blueprint';
            const width = parseInt(req.body && req.body.original_width, 10);
            const height = parseInt(req.body && req.body.original_height, 10);
            if (!(width > 0) || !(height > 0)) {
                try { fs.unlinkSync(req.file.path); } catch (_) {}
                return res.status(400).json({ ok: false, error: 'original_width/height required' });
            }
            // INSERT tactical_blueprints … image_url = '/media/tactical-blueprints/' + filename
            // return { ok: true, blueprint }
            res.status(501).json({ ok: false, error: 'Not APPLIED yet — see MOB DISC' });
        } catch (err) {
            res.status(err.status || 500).json({ ok: false, error: err.message || String(err) });
        }
    }
);
```

**Also plan CRUD (same APPLY or immediate follow-on):**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/tactical/blueprints` | List |
| GET | `/api/tactical/blueprints/:id` | One + pins |
| POST | `/api/tactical/pins` | Create pin (geo and/or UV) |
| PATCH | `/api/tactical/pins/:id` | Move / relink device |
| DELETE | `/api/tactical/pins/:id` | Remove |

Server must **re-clamp** `uv_x`/`uv_y` on write (never trust client alone).

---

## Sanity & UX guardrails (locked)

| Guard | Rule |
|-------|------|
| File size | **5 MB** multer `limits.fileSize` + post-check |
| MIME | **jpeg / png / webp only** |
| Filename | **UUID + ext** — never `originalname` path |
| UV | Clamp **[0, 1]** on drop and on API |
| Geo vs blueprint | `blueprint_id` NULL = global map; set = floor pin |
| Disk DoS | Prefer also `requireFreeDiskSpace` once SEC Task 3 APPLIES |

---

## Why this fixes the Architect’s 4K vs 1080p question

| Wrong (do not do) | Right (this design) |
|-------------------|---------------------|
| Store `clientX` / CSS px | Store `uv_x` / `uv_y` ∈ [0,1] |
| Store overlay pixel at drop resolution | Store fraction of image bounds |
| Recalculate per monitor DPI | Same UV → `latLngFromUv` on any Leaflet size |

---

## Out of this Phase 1.5 paper

- Live Turf entry/exit  
- Migrating existing `localStorage` POIs (separate small MOB when schema is live)  
- Dual-pane / PiP  
- Patching Google SEC five (separate genre — still priority after Tactical handoff)

---

## Next commands

| Intent | Say |
|--------|-----|
| Keep designing only | (done — this disc) |
| Implement schema + upload + UV helpers | `MOB-APPLY TACTICAL-BLUEPRINT-SCHEMA-UV-UPLOAD-V1` |
| Open security first (recommended queue) | `MOB-APPLY SEC-MSGWSS-HMAC-AUTH-V1` |

Until APPLY — **zero code** for blueprint tables/routes.
