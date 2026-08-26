-- 028_system_anomalies.sql
-- Platform anomaly recorder: durable crash / fatal dump with redacted log context.

BEGIN;

CREATE TABLE IF NOT EXISTS system_anomalies (
    id            TEXT PRIMARY KEY,
    timestamp     TEXT NOT NULL,
    component     TEXT NOT NULL,
    error_trace   TEXT,
    redacted_logs TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS system_anomalies_timestamp_idx
    ON system_anomalies (timestamp DESC);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (28, 'system_anomalies', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
