-- 011_case_files_ops_case_id.sql
-- CASE-FILE-CONTINUE-FROM-OPS-CASE-V1 — link Case File ↔ Ops Case ticket

BEGIN;

ALTER TABLE case_files
    ADD COLUMN IF NOT EXISTS ops_case_id TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_case_files_ops_case_id
    ON case_files (ops_case_id)
    WHERE ops_case_id IS NOT NULL AND btrim(ops_case_id) <> '';

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (11, 'case_files_ops_case_id', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
