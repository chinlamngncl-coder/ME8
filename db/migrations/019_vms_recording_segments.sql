-- 019_vms_recording_segments.sql
-- VMS Step 2: Segment Index
-- Tracks every 5-minute MP4 chunk written to the NAS by the continuous writer.
-- file_path is ABSOLUTE — server-side only, never sent to client.
-- Gap detection: done at query time via timestamp math, not via gap rows.
--   if Segment[n].start_at - Segment[n-1].end_at > FM_VMS_GAP_THRESHOLD_MS → render grey gap
-- end_at NULL: if (now - start_at) < (segment_time + grace) → 'recording', else → 'crash gap'

BEGIN;

CREATE TABLE IF NOT EXISTS vms_recording_segments (
    id                TEXT    PRIMARY KEY,
    cam_id            TEXT    NOT NULL,
    volume_id         TEXT    NOT NULL REFERENCES vms_storage_volumes(id) ON DELETE SET NULL,
    start_at          TEXT    NOT NULL,
    end_at            TEXT,
    file_path         TEXT    NOT NULL,
    file_size_bytes   BIGINT,
    status            TEXT    NOT NULL DEFAULT 'recording'
        CHECK (status IN ('recording', 'complete', 'unavailable'))
);

CREATE INDEX IF NOT EXISTS vms_recording_segments_cam_time_idx
    ON vms_recording_segments (cam_id, start_at);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (19, 'vms_recording_segments', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
