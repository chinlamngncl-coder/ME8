-- 030_fixed_cameras_parent_nvr.sql
-- NVR auto-provisioned fixed cameras link back to parent NVR (NMS-SETTINGS-LICENSING-V2)

BEGIN;

ALTER TABLE fixed_cameras
    ADD COLUMN IF NOT EXISTS parent_nvr_id TEXT,
    ADD COLUMN IF NOT EXISTS nvr_channel_index INTEGER;

CREATE INDEX IF NOT EXISTS idx_fixed_cameras_parent_nvr
    ON fixed_cameras (parent_nvr_id)
    WHERE parent_nvr_id IS NOT NULL;

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (30, 'fixed_cameras_parent_nvr', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
