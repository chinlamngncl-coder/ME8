-- 025_vms_incident_cases.sql
-- VMS Step 6: Incident Case header — one case = one court package.
-- status: open | closed | exported

BEGIN;

CREATE TABLE IF NOT EXISTS vms_incident_cases (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','closed','exported')),
    created_by  TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS vms_cases_status_idx ON vms_incident_cases (status, created_at DESC);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (25, 'vms_incident_cases', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
