-- 031_vms_storage_tier_type.sql
-- Strict storage tier ENUM for federated playback (local_edge / nvr_hdd / nas_archive)

BEGIN;

ALTER TABLE vms_storage_volumes
    ADD COLUMN IF NOT EXISTS tier_type TEXT NOT NULL DEFAULT 'nas_archive';

UPDATE vms_storage_volumes
SET tier_type = CASE
    WHEN notes ~* 'tier:edge-nvme' OR role = 'bwc-ingest' THEN 'local_edge'
    WHEN notes ~* 'tier:nvr-local' OR name ~* 'nvr' THEN 'nvr_hdd'
    ELSE 'nas_archive'
END
WHERE tier_type IS NULL OR tier_type = 'nas_archive';

ALTER TABLE vms_storage_volumes
    DROP CONSTRAINT IF EXISTS vms_storage_volumes_tier_type_check;

ALTER TABLE vms_storage_volumes
    ADD CONSTRAINT vms_storage_volumes_tier_type_check
    CHECK (tier_type IN ('local_edge', 'nvr_hdd', 'nas_archive'));

CREATE INDEX IF NOT EXISTS vms_storage_volumes_tier_type_idx
    ON vms_storage_volumes (tier_type);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (31, 'vms_storage_tier_type', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
