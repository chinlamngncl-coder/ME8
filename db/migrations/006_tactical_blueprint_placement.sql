-- 006_tactical_blueprint_placement.sql
-- MOB-APPLY TACTICAL-BLUEPRINT-PLACE-RESIZE-V1 — saved geo bounds for floor plan on map

BEGIN;

ALTER TABLE tactical_blueprints
    ADD COLUMN IF NOT EXISTS placement_south DOUBLE PRECISION NULL,
    ADD COLUMN IF NOT EXISTS placement_west DOUBLE PRECISION NULL,
    ADD COLUMN IF NOT EXISTS placement_north DOUBLE PRECISION NULL,
    ADD COLUMN IF NOT EXISTS placement_east DOUBLE PRECISION NULL;

ALTER TABLE tactical_blueprints DROP CONSTRAINT IF EXISTS tactical_blueprints_placement_chk;
ALTER TABLE tactical_blueprints
    ADD CONSTRAINT tactical_blueprints_placement_chk CHECK (
        (
            placement_south IS NULL
            AND placement_west IS NULL
            AND placement_north IS NULL
            AND placement_east IS NULL
        )
        OR (
            placement_south IS NOT NULL
            AND placement_west IS NOT NULL
            AND placement_north IS NOT NULL
            AND placement_east IS NOT NULL
            AND placement_north > placement_south
            AND placement_east > placement_west
            AND placement_south >= -90 AND placement_north <= 90
            AND placement_west >= -180 AND placement_east <= 180
        )
    );

INSERT INTO schema_migrations (version, name, applied_at)
VALUES (6, 'tactical_blueprint_placement', CURRENT_TIMESTAMP::TEXT)
ON CONFLICT (version) DO NOTHING;

COMMIT;
