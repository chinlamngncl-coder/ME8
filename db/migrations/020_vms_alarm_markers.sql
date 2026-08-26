-- 020_vms_alarm_markers.sql
-- VMS Step 2: Decoupled Alarm Markers
-- Lightweight timestamp rows from ONVIF pull-point events (motion/tamper/line_crossing).
-- Intentionally NOT burned into video files — enables millisecond queries and
-- retroactive re-labeling without touching the evidence chain of custody.
-- retain_marker = TRUE means this row survives even if the video segment is purged.

BEGIN;

CREATE TABLE IF NOT EXISTS vms_alarm_markers (
    id            TEXT    PRIMARY KEY,
    cam_id        TEXT    NOT NULL,
    occurred_at   TEXT    NOT NULL,
    event_type    TEXT    NOT NULL
        CHECK (event_type IN ('motion', 'tamper', 'line_crossing', 'analytics', 'anpr', 'sos', 'other')),
    note          TEXT    NOT NULL DEFAULT '',
    retain_marker BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS vms_alarm_markers_cam_time_idx
    ON vms_alarm_markers (cam_id, occurred_at);

CREATE INDEX IF NOT EXISTS vms_alarm_markers_type_idx
    ON vms_alarm_markers (event_type, occurred_at);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (20, 'vms_alarm_markers', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
