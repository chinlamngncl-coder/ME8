-- 007_bwc_paired_secondary.sql
-- ANPR 1-to-1 Parent/Child PIP pairing — paired_secondary_camera_id

BEGIN;

ALTER TABLE bwc_devices
    ADD COLUMN IF NOT EXISTS paired_secondary_camera_id TEXT NULL;

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (7, 'bwc_paired_secondary', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
