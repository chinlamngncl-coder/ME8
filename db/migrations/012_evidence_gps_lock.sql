-- 012_evidence_gps_lock.sql
-- Geospatial Reconstruction Step 1 — lock GPS telemetry to Evidence Library videos

BEGIN;

ALTER TABLE gps_track_points
    ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_gps_track_unlocked_time
    ON gps_track_points (recorded_at)
    WHERE COALESCE(locked, FALSE) = FALSE;

CREATE TABLE IF NOT EXISTS evidence_gps_traces (
    evidence_file_id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    from_iso TEXT NOT NULL,
    to_iso TEXT NOT NULL,
    point_count INTEGER NOT NULL DEFAULT 0,
    points_json TEXT NOT NULL DEFAULT '[]',
    companion_rel TEXT,
    locked_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_evidence_gps_traces_device_window
    ON evidence_gps_traces (device_id, from_iso, to_iso);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (12, 'evidence_gps_lock', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
