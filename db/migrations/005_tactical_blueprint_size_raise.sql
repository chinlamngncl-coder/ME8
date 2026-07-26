-- 005_tactical_blueprint_size_raise.sql
-- MOB-APPLY TACTICAL-BLUEPRINT-SIZE-RAISE-V1
-- App default upload = 25 MB; enterprise env may allow up to 50 MB.
-- DB CHECK ceiling raised to 50 MB so inserts are not rejected below app limit.

BEGIN;

ALTER TABLE tactical_blueprints DROP CONSTRAINT IF EXISTS tactical_blueprints_byte_size_check;
ALTER TABLE tactical_blueprints
    ADD CONSTRAINT tactical_blueprints_byte_size_check
    CHECK (byte_size > 0 AND byte_size <= 52428800);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (5, 'tactical_blueprint_size_raise', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
