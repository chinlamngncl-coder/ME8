-- 010_bwc_serial_no.sql
-- BWC-SERIAL-ASSET-REGISTRY-V1 — camera sticker serial / asset tag (unique when set)

BEGIN;

ALTER TABLE bwc_devices
    ADD COLUMN IF NOT EXISTS serial_no TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bwc_serial_no_unique
    ON bwc_devices (lower(serial_no))
    WHERE serial_no IS NOT NULL AND btrim(serial_no) <> '';

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (10, 'bwc_serial_no', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
