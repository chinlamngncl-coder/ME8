-- 029_nvr_devices.sql
-- NVR parent registry + channel → fixed_cameras link (NVR-DEVICE-REGISTRY-V1)

BEGIN;

CREATE TABLE IF NOT EXISTS nvr_devices (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL DEFAULT '',
    vendor              TEXT NOT NULL DEFAULT '',
    host                TEXT NOT NULL DEFAULT '',
    http_port           INTEGER NOT NULL DEFAULT 80,
    rtsp_port           INTEGER NOT NULL DEFAULT 554,
    username            TEXT NOT NULL DEFAULT '',
    -- AES-256-GCM vault envelope JSON (me8-secrets-v2); never store plaintext password
    password_enc        TEXT NOT NULL DEFAULT '',
    protocol            TEXT NOT NULL DEFAULT 'onvif'
                        CHECK (protocol IN ('onvif', 'rtsp_template')),
    onvif_device_path   TEXT NOT NULL DEFAULT '/onvif/device_service',
    rtsp_transport      TEXT NOT NULL DEFAULT 'tcp'
                        CHECK (rtsp_transport IN ('tcp', 'udp')),
    rtsp_url_template   TEXT NOT NULL DEFAULT '',
    enabled             BOOLEAN NOT NULL DEFAULT TRUE,
    notes               TEXT NOT NULL DEFAULT '',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nvr_devices_enabled
    ON nvr_devices (enabled) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_nvr_devices_host
    ON nvr_devices (host) WHERE host <> '';

CREATE TABLE IF NOT EXISTS nvr_channels (
    nvr_id                  TEXT NOT NULL
                            REFERENCES nvr_devices (id) ON DELETE CASCADE,
    channel_index           INTEGER NOT NULL,
    fixed_camera_id         TEXT
                            REFERENCES fixed_cameras (id) ON DELETE SET NULL,
    onvif_profile_token     TEXT NOT NULL DEFAULT '',
    name                    TEXT NOT NULL DEFAULT '',
    enabled                 BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (nvr_id, channel_index)
);

CREATE INDEX IF NOT EXISTS idx_nvr_channels_fixed_camera
    ON nvr_channels (fixed_camera_id)
    WHERE fixed_camera_id IS NOT NULL;

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (29, 'nvr_devices', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
