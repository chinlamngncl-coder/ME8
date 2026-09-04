-- 032_evidence_relative_path_unique.sql
-- DB-UNIQUENESS-AND-LOCKS-V1
-- Two concurrent registerFromUpload() calls for the same on-disk file could
-- both miss findEvidenceByRelative() and insert two catalog rows with the same
-- relative_path. Enforce UNIQUE(relative_path); dedupe first, keeping the
-- oldest row and re-pointing child references to the survivor.

BEGIN;

CREATE TEMP TABLE _ev_dupes AS
SELECT d.id AS dup_id, k.keep_id
FROM evidence_files d
JOIN (
    SELECT relative_path,
           (ARRAY_AGG(id ORDER BY created_at ASC, id ASC))[1] AS keep_id
    FROM evidence_files
    WHERE relative_path IS NOT NULL
    GROUP BY relative_path
    HAVING COUNT(*) > 1
) k ON k.relative_path = d.relative_path
WHERE d.id <> k.keep_id;

-- Many-to-one children: re-point, drop rows that would collide.
UPDATE evidence_downloads c SET evidence_file_id = x.keep_id FROM _ev_dupes x WHERE c.evidence_file_id = x.dup_id;
UPDATE evidence_attachments c SET evidence_file_id = x.keep_id FROM _ev_dupes x WHERE c.evidence_file_id = x.dup_id;
UPDATE evidence_exports c SET evidence_file_id = x.keep_id FROM _ev_dupes x WHERE c.evidence_file_id = x.dup_id;
UPDATE evidence_secure_exports c SET evidence_file_id = x.keep_id FROM _ev_dupes x WHERE c.evidence_file_id = x.dup_id;

DELETE FROM case_file_evidence c USING _ev_dupes x
WHERE c.evidence_file_id = x.dup_id
  AND EXISTS (SELECT 1 FROM case_file_evidence k WHERE k.case_file_id = c.case_file_id AND k.evidence_file_id = x.keep_id);
UPDATE case_file_evidence c SET evidence_file_id = x.keep_id FROM _ev_dupes x WHERE c.evidence_file_id = x.dup_id;

-- One-to-one children (PK = evidence_file_id): keep survivor's row if present.
DELETE FROM evidence_meta c USING _ev_dupes x
WHERE c.evidence_file_id = x.dup_id
  AND EXISTS (SELECT 1 FROM evidence_meta k WHERE k.evidence_file_id = x.keep_id);
UPDATE evidence_meta c SET evidence_file_id = x.keep_id FROM _ev_dupes x WHERE c.evidence_file_id = x.dup_id;

DELETE FROM evidence_gps_traces c USING _ev_dupes x
WHERE c.evidence_file_id = x.dup_id
  AND EXISTS (SELECT 1 FROM evidence_gps_traces k WHERE k.evidence_file_id = x.keep_id);
UPDATE evidence_gps_traces c SET evidence_file_id = x.keep_id FROM _ev_dupes x WHERE c.evidence_file_id = x.dup_id;

DELETE FROM evidence_files e USING _ev_dupes x WHERE e.id = x.dup_id;

DROP TABLE _ev_dupes;

CREATE UNIQUE INDEX IF NOT EXISTS uq_evidence_files_relative_path
    ON evidence_files(relative_path);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (32, 'evidence_relative_path_unique', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
