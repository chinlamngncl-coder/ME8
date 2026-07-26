-- 004_fixed_cameras_stream_transport.sql
-- Phase 2 Task 2.5 — Enterprise ONVIF hardening: RTSP stream_transport (tcp|udp)

BEGIN;

ALTER TABLE fixed_cameras
    ADD COLUMN IF NOT EXISTS stream_transport TEXT NOT NULL DEFAULT 'tcp';

-- Backfill from legacy onvif_rtsp_transport when present
UPDATE fixed_cameras
SET stream_transport = CASE
    WHEN lower(coalesce(onvif_rtsp_transport, 'tcp')) = 'udp' THEN 'udp'
    ELSE 'tcp'
END
WHERE stream_transport IS NULL
   OR stream_transport = ''
   OR stream_transport NOT IN ('tcp', 'udp');

-- Enforce tcp|udp only (drop prior check if any, then add)
ALTER TABLE fixed_cameras DROP CONSTRAINT IF EXISTS fixed_cameras_stream_transport_chk;
ALTER TABLE fixed_cameras
    ADD CONSTRAINT fixed_cameras_stream_transport_chk
    CHECK (stream_transport IN ('tcp', 'udp'));

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (4, 'fixed_cameras_stream_transport', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
