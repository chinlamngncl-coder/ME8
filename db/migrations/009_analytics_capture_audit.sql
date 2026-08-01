-- 009_analytics_capture_audit.sql
-- Enterprise audit: user/BWC searchable paths for ANPR + FR captures

BEGIN;

ALTER TABLE anpr_capture_history ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE anpr_capture_history ADD COLUMN IF NOT EXISTS bwc_id TEXT;
ALTER TABLE anpr_capture_history ADD COLUMN IF NOT EXISTS macro_path TEXT;
ALTER TABLE anpr_capture_history ADD COLUMN IF NOT EXISTS micro_path TEXT;

CREATE INDEX IF NOT EXISTS idx_anpr_hist_user ON anpr_capture_history (user_id);
CREATE INDEX IF NOT EXISTS idx_anpr_hist_bwc ON anpr_capture_history (bwc_id);

CREATE TABLE IF NOT EXISTS fr_capture_history (
    id TEXT PRIMARY KEY,
    captured_at TEXT NOT NULL,
    user_id TEXT,
    bwc_id TEXT NOT NULL DEFAULT '',
    device_label TEXT NOT NULL DEFAULT '',
    display_name TEXT,
    score_pct DOUBLE PRECISION,
    match BOOLEAN NOT NULL DEFAULT FALSE,
    hit_id TEXT,
    blacklist_id TEXT,
    macro_path TEXT,
    micro_path TEXT,
    crop_url TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    gps_at TEXT,
    source TEXT NOT NULL DEFAULT 'live',
    payload_json TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fr_hist_captured ON fr_capture_history (captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_fr_hist_user ON fr_capture_history (user_id);
CREATE INDEX IF NOT EXISTS idx_fr_hist_bwc ON fr_capture_history (bwc_id);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (9, 'analytics_capture_audit', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
