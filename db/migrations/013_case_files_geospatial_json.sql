-- 013_case_files_geospatial_json.sql
-- Geospatial Reconstruction Step 3 — attach map/telemetry snapshot to a Case File

BEGIN;

ALTER TABLE case_files
    ADD COLUMN IF NOT EXISTS geospatial_json TEXT NULL;

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (13, 'case_files_geospatial_json', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
