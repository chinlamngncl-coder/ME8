-- 024_vms_bwc_spatial_rollback.sql
-- ROLLBACK: Remove static zone_id / map_x / map_y from bwc_devices.
--
-- REASON: BWC officers are mobile. Hardcoding floor-plan coordinates into the
-- device registry glues them to a fixed point. Their live position must come
-- from real-time GPS telemetry (gps_track_points) or future BLE beacons --
-- never from a static DB column.
--
-- vms_alarm_markers retains zone_id / map_x / map_y: alarms originate from
-- fixed sensors (ONVIF motion, door contacts) and DO have a static location.

BEGIN;

ALTER TABLE bwc_devices
    DROP COLUMN IF EXISTS zone_id,
    DROP COLUMN IF EXISTS map_x,
    DROP COLUMN IF EXISTS map_y;

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (24, 'vms_bwc_spatial_rollback', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
