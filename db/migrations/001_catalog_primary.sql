BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS catalog_migration_runs (
    migration_id TEXT PRIMARY KEY,
    source_sha256 TEXT NOT NULL,
    source_wal_sha256 TEXT,
    source_shm_sha256 TEXT,
    source_path TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    manifest_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bwc_devices (
    device_id TEXT PRIMARY KEY,
    operator_name TEXT NOT NULL DEFAULT '',
    map_group TEXT NOT NULL DEFAULT '',
    user_name TEXT NOT NULL DEFAULT '',
    password TEXT NOT NULL DEFAULT '',
    protocol TEXT NOT NULL DEFAULT 'sip',
    geofence_json TEXT,
    lifecycle_json TEXT,
    unit_code TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bwc_map_group ON bwc_devices(map_group);

CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    ts TEXT NOT NULL,
    actor TEXT,
    role TEXT,
    action TEXT NOT NULL,
    target TEXT,
    detail_json TEXT,
    client_ip TEXT,
    migration_source TEXT,
    migration_source_id BIGINT
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_migration_source
    ON audit_log(migration_source, migration_source_id)
    WHERE migration_source IS NOT NULL AND migration_source_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evidence_files (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'dock_ftp',
    storage_tier TEXT NOT NULL DEFAULT 'local',
    relative_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    byte_size BIGINT NOT NULL DEFAULT 0,
    sha256 TEXT,
    device_id TEXT,
    operator_name TEXT,
    uploaded_at TEXT NOT NULL,
    peer_ip TEXT,
    sync_status TEXT NOT NULL DEFAULT 'synced',
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_evidence_uploaded ON evidence_files(uploaded_at DESC);

CREATE TABLE IF NOT EXISTS evidence_downloads (
    download_id TEXT PRIMARY KEY,
    evidence_file_id TEXT NOT NULL,
    actor TEXT,
    user_id TEXT,
    role TEXT,
    requested_at TEXT NOT NULL,
    token_expires_at TEXT NOT NULL,
    consumed_at TEXT,
    client_ip TEXT
);
CREATE INDEX IF NOT EXISTS idx_evidence_dl_ts ON evidence_downloads(requested_at DESC);

CREATE TABLE IF NOT EXISTS bwc_messages (
    id BIGSERIAL PRIMARY KEY,
    device_id TEXT NOT NULL,
    direction TEXT NOT NULL CHECK(direction IN ('in', 'out')),
    text TEXT NOT NULL,
    msg_time TEXT,
    msg_type INTEGER,
    msg_level INTEGER,
    sender_name TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bwc_messages_device ON bwc_messages(device_id, id DESC);

CREATE TABLE IF NOT EXISTS evidence_meta (
    evidence_file_id TEXT PRIMARY KEY,
    notes TEXT,
    sos_incident_id TEXT,
    trim_start_sec DOUBLE PRECISION,
    trim_end_sec DOUBLE PRECISION,
    dock_id TEXT,
    dock_bay INTEGER,
    tags_json TEXT,
    updated_at TEXT,
    updated_by TEXT
);

CREATE TABLE IF NOT EXISTS evidence_attachments (
    id TEXT PRIMARY KEY,
    evidence_file_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    relative_path TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'photo',
    byte_size BIGINT NOT NULL DEFAULT 0,
    uploaded_at TEXT NOT NULL,
    uploaded_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_evidence_attach_file ON evidence_attachments(evidence_file_id);

CREATE TABLE IF NOT EXISTS evidence_exports (
    export_id TEXT PRIMARY KEY,
    evidence_file_id TEXT NOT NULL,
    export_type TEXT NOT NULL,
    relative_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    byte_size BIGINT NOT NULL DEFAULT 0,
    actor TEXT,
    user_id TEXT,
    created_at TEXT NOT NULL,
    meta_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_evidence_exports_file ON evidence_exports(evidence_file_id DESC);

CREATE TABLE IF NOT EXISTS evidence_secure_exports (
    request_id TEXT PRIMARY KEY,
    evidence_file_id TEXT NOT NULL,
    requested_by TEXT,
    requester_user_id TEXT,
    requester_role TEXT,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    requested_at TEXT NOT NULL,
    reviewed_by TEXT,
    reviewer_user_id TEXT,
    reviewed_at TEXT,
    deny_reason TEXT,
    encrypted_path TEXT,
    encrypted_file_name TEXT,
    byte_size BIGINT NOT NULL DEFAULT 0,
    download_expires_at TEXT,
    consumed_at TEXT,
    client_ip TEXT
);
CREATE INDEX IF NOT EXISTS idx_evidence_secure_status
    ON evidence_secure_exports(status, requested_at DESC);

CREATE TABLE IF NOT EXISTS gps_track_points (
    id BIGSERIAL PRIMARY KEY,
    device_id TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    source TEXT NOT NULL DEFAULT 'sip'
);
CREATE INDEX IF NOT EXISTS idx_gps_track_device_time
    ON gps_track_points(device_id, recorded_at);

CREATE TABLE IF NOT EXISTS case_files (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    officer_name TEXT,
    device_id TEXT,
    sos_incident_id TEXT,
    narrative TEXT,
    created_at TEXT NOT NULL,
    created_by TEXT,
    updated_at TEXT NOT NULL,
    updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_case_files_updated ON case_files(updated_at DESC);

CREATE TABLE IF NOT EXISTS case_file_evidence (
    case_file_id TEXT NOT NULL,
    evidence_file_id TEXT NOT NULL,
    linked_at TEXT NOT NULL,
    linked_by TEXT,
    PRIMARY KEY (case_file_id, evidence_file_id)
);
CREATE INDEX IF NOT EXISTS idx_case_file_evidence_case
    ON case_file_evidence(case_file_id);

CREATE TABLE IF NOT EXISTS operations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    dispatch_group_id TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_by TEXT,
    activated_at TEXT,
    activated_by TEXT,
    closed_at TEXT,
    closed_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_operations_status ON operations(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS overlay_pins (
    id TEXT PRIMARY KEY,
    operation_id TEXT NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
    pin_type TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    body TEXT,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    link_url TEXT,
    dispatch_group_id TEXT,
    color TEXT,
    visible INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_overlay_op ON overlay_pins(operation_id, visible);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (1, 'catalog_primary', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
