-- 023_vms_spatial_pins.sql
-- VMS Step 4: Spatial pin coordinates for BWC devices and alarm markers.
-- Fixed cameras: zone_id, map_x, map_y are added to the JSON registry (fixedCamRegistry.js buildCam).
-- This migration covers the DB-backed tables: bwc_devices and vms_alarm_markers.
-- map_x / map_y: 0.0000–1.0000 relative to floor plan image dimensions.
--   0,0 = top-left corner; 1,1 = bottom-right corner.

BEGIN;

ALTER TABLE bwc_devices
    ADD COLUMN IF NOT EXISTS zone_id TEXT,
    ADD COLUMN IF NOT EXISTS map_x   DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS map_y   DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS bwc_devices_zone_idx ON bwc_devices (zone_id);

ALTER TABLE vms_alarm_markers
    ADD COLUMN IF NOT EXISTS zone_id TEXT,
    ADD COLUMN IF NOT EXISTS map_x   DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS map_y   DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS vms_alarm_markers_zone_idx ON vms_alarm_markers (zone_id);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (23, 'vms_spatial_pins', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
