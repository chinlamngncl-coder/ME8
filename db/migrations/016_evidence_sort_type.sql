-- 016_evidence_sort_type.sql
-- AI sorter Face/Car/Others label on catalog rows

BEGIN;

ALTER TABLE evidence_files
    ADD COLUMN IF NOT EXISTS sort_type TEXT NOT NULL DEFAULT '';

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (16, 'evidence_sort_type', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
