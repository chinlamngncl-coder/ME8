-- 015_evidence_is_priority.sql
-- Dock "Important" / level > 0 — legal-hold flag for FIFO skip

BEGIN;

ALTER TABLE evidence_files
    ADD COLUMN IF NOT EXISTS is_priority INTEGER NOT NULL DEFAULT 0;

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (15, 'evidence_is_priority', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
