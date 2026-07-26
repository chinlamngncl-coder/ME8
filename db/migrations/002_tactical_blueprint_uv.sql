-- 002_tactical_blueprint_uv.sql
-- Phase 2 Task 2.1 — Tactical blueprint + UV pins (MOB-DISC-TACTICAL-BLUEPRINT-SCHEMA-UV-20260724)

BEGIN;

-- UUID helper (no-op if already present / built-in on PG 13+)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tactical_blueprints (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id         TEXT NOT NULL DEFAULT 'default',
    name            TEXT NOT NULL,
    image_url       TEXT NOT NULL,
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
    uv_y            DOUBLE PRECISION NULL CHECK (uv_y IS NULL OR (uv_y <= 1 AND uv_y >= 0)),
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

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (2, 'tactical_blueprint_uv', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
