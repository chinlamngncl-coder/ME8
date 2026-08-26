-- 021_vms_sites.sql
-- VMS Step 4: Top-level Site nodes for the Spatial Entity Tree.
-- A site is the highest organisational unit (e.g., "HQ Campus", "Substation North").

BEGIN;

CREATE TABLE IF NOT EXISTS vms_sites (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    notes      TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (21, 'vms_sites', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
