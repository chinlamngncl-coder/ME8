-- 026_vms_case_items.sql
-- VMS Step 6: Items added to an Incident Case via the Evidence Cart.
-- source_type: 'bwc' | 'fixed' | 'anpr' | 'note'
-- source_id:   evidence_file_id (BWC), vms_recording_segments.id (fixed),
--              anpr_capture_history.id (ANPR), or free text id (note).
-- start_at / end_at: operator-trimmed clip bounds (ISO 8601); NULL = full source.
-- metadata_json: snapshot URL, officer name, plate, note body, cam name, etc.
-- added_by: dashboard username who clicked "Add to Case".

BEGIN;

CREATE TABLE IF NOT EXISTS vms_case_items (
    id            TEXT PRIMARY KEY,
    case_id       TEXT NOT NULL REFERENCES vms_incident_cases(id) ON DELETE CASCADE,
    source_type   TEXT NOT NULL CHECK (source_type IN ('bwc','fixed','anpr','note')),
    source_id     TEXT NOT NULL,
    start_at      TEXT,
    end_at        TEXT,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    added_by      TEXT NOT NULL DEFAULT '',
    added_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS vms_case_items_case_idx ON vms_case_items (case_id, added_at ASC);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (26, 'vms_case_items', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
