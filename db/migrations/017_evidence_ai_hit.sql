-- 017_evidence_ai_hit.sql
-- Persist AI match result directly on the evidence file row so the
-- catalog query can surface it without runtime JOINs on path strings.

BEGIN;

ALTER TABLE evidence_files ADD COLUMN IF NOT EXISTS ai_hit_target_id TEXT;
ALTER TABLE evidence_files ADD COLUMN IF NOT EXISTS ai_hit_type TEXT; -- 'fr' | 'anpr'

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (17, 'evidence_ai_hit', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
