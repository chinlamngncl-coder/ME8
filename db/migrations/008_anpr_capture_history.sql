-- 008_anpr_capture_history.sql
-- ANPR Search & History — persistent capture events (macro/micro crops + MMR + GPS)

BEGIN;

CREATE TABLE IF NOT EXISTS anpr_capture_history (
    id TEXT PRIMARY KEY,
    captured_at TEXT NOT NULL,
    cam_id TEXT NOT NULL DEFAULT '',
    device_label TEXT NOT NULL DEFAULT '',
    plate TEXT,
    plate_compact TEXT,
    unclear BOOLEAN NOT NULL DEFAULT FALSE,
    review_status TEXT,
    vehicle_type TEXT,
    make TEXT,
    model TEXT,
    color TEXT,
    mmr_text TEXT,
    vehicle_url TEXT,
    crop_url TEXT,
    track_id TEXT,
    seq_no BIGINT,
    confidence DOUBLE PRECISION,
    sharpness DOUBLE PRECISION,
    motion TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    gps_at TEXT,
    source TEXT NOT NULL DEFAULT 'live',
    payload_json TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_anpr_hist_captured ON anpr_capture_history (captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_anpr_hist_plate ON anpr_capture_history (plate_compact);
CREATE INDEX IF NOT EXISTS idx_anpr_hist_cam ON anpr_capture_history (cam_id);
CREATE INDEX IF NOT EXISTS idx_anpr_hist_vtype ON anpr_capture_history (vehicle_type);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (8, 'anpr_capture_history', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
