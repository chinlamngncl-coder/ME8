-- 027_ensure_vms_storage_volumes.sql
-- Idempotent safety net: create vms_storage_volumes if an older install skipped 018.
-- Soft-fail safe for live catalogs that already have the table.

BEGIN;

CREATE TABLE IF NOT EXISTS vms_storage_volumes (
    id               TEXT    PRIMARY KEY,
    name             TEXT    NOT NULL,
    role             TEXT    NOT NULL CHECK (role IN ('bwc-ingest', 'fixed-archive', 'ai-feed')),
    mount_path       TEXT    NOT NULL,
    capacity_gb      INTEGER,
    threshold_pct    INTEGER NOT NULL DEFAULT 85,
    retention_days   INTEGER,
    enabled          BOOLEAN NOT NULL DEFAULT TRUE,
    notes            TEXT    NOT NULL DEFAULT '',
    created_at       TEXT    NOT NULL,
    updated_at       TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS vms_storage_volumes_role_idx ON vms_storage_volumes (role);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (27, 'ensure_vms_storage_volumes', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
