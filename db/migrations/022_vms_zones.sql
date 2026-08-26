-- 022_vms_zones.sql
-- VMS Step 4: Zones within a Site (e.g., "Zone A — Main Entrance", "Floor 3 — Server Room").
-- map_image_path: absolute path to the uploaded 2D floor plan — SERVER-SIDE ONLY, never sent to client.
-- Operators access the floor plan image via GET /api/vms/zones/:id/map-image (auth-gated).
-- Coordinate system for camera pins: (x FLOAT 0.0–1.0, y FLOAT 0.0–1.0) relative to image dimensions.

BEGIN;

CREATE TABLE IF NOT EXISTS vms_zones (
    id               TEXT    PRIMARY KEY,
    site_id          TEXT    NOT NULL REFERENCES vms_sites(id) ON DELETE CASCADE,
    name             TEXT    NOT NULL,
    map_image_path   TEXT,
    map_image_name   TEXT,
    notes            TEXT    NOT NULL DEFAULT '',
    created_at       TEXT    NOT NULL,
    updated_at       TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS vms_zones_site_idx ON vms_zones (site_id);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (22, 'vms_zones', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
