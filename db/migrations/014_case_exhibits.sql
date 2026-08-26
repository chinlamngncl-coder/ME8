-- 014_case_exhibits.sql
-- Incident exhibit engine — chronological exhibits on a case file

BEGIN;

CREATE TABLE IF NOT EXISTS case_exhibits (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    exhibit_number INTEGER NOT NULL,
    exhibit_type TEXT NOT NULL,
    title TEXT,
    content TEXT,
    file_url TEXT,
    created_at TEXT NOT NULL,
    UNIQUE (case_id, exhibit_number)
);
CREATE INDEX IF NOT EXISTS idx_case_exhibits_case_time
    ON case_exhibits(case_id, created_at);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (14, 'case_exhibits', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
