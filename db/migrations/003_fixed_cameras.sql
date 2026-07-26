-- 003_fixed_cameras.sql
-- Phase 2 Task 2.4 — Fixed cameras catalog + encrypted ONVIF credentials

BEGIN;

CREATE TABLE IF NOT EXISTS fixed_cameras (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    lat                 DOUBLE PRECISION NOT NULL DEFAULT 0,
    lng                 DOUBLE PRECISION NOT NULL DEFAULT 0,
    zone                TEXT NOT NULL DEFAULT '',
    map_icon            TEXT NOT NULL DEFAULT 'fixed',
    stream_source       TEXT NOT NULL DEFAULT 'none'
                        CHECK (stream_source IN ('onvif', 'rtsp', 'none')),
    rtsp_url            TEXT NOT NULL DEFAULT '',
    onvif_host          TEXT NOT NULL DEFAULT '',
    onvif_port          INTEGER NOT NULL DEFAULT 80,
    onvif_user          TEXT NOT NULL DEFAULT '',
    -- AES-256-GCM vault envelope JSON (me8-secrets-v2); never store plaintext password
    onvif_password_enc  TEXT NOT NULL DEFAULT '',
    onvif_device_path   TEXT NOT NULL DEFAULT '/onvif/device_service',
    onvif_rtsp_transport TEXT NOT NULL DEFAULT 'tcp'
                        CHECK (onvif_rtsp_transport IN ('tcp', 'udp')),
    ptz_enabled         BOOLEAN NOT NULL DEFAULT FALSE,
    enabled             BOOLEAN NOT NULL DEFAULT TRUE,
    notes               TEXT NOT NULL DEFAULT '',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fixed_cameras_zone
    ON fixed_cameras (zone);
CREATE INDEX IF NOT EXISTS idx_fixed_cameras_enabled
    ON fixed_cameras (enabled) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_fixed_cameras_onvif_host
    ON fixed_cameras (onvif_host) WHERE onvif_host <> '';

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (3, 'fixed_cameras', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
