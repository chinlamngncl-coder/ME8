'use strict';
/**
 * VMS Zone RBAC Middleware — Phase 4 (Real Implementation)
 *
 * Convention (locked):
 *   super_admin role         → always pass, all zones
 *   user.allowedZones = null/undefined → all zones (unrestricted operator)
 *   user.allowedZones = []   → no zones (fully restricted — sees nothing)
 *   user.allowedZones = [id1, id2] → only those zone IDs
 *
 * Placement: always AFTER dashboardAuth.requireDashboardAuth.
 *
 * Supported route params:
 *   req.params.camId      → look up zone_id in fixedCamRegistry (sync)
 *   req.params.segmentId  → look up cam_id in DB → zone_id in registry (async)
 *   req.params.zoneId     → check directly
 *   req.params.siteId     → pass (site-level access = zone access implied by listZones filter)
 */

const fixedCamRegistry = require('../fixedCamRegistry');
const siteDb           = require('../siteDb');

function isSuperAdmin(user) {
    return user && (user.role === 'super_admin' || user.role === 'superadmin');
}

/**
 * Resolve the zone_id for the resource being accessed.
 * Returns null if the zone cannot be determined (pass-through — don't block on unknown).
 */
async function resolveZoneId(req) {
    /* Direct zone param */
    if (req.params.zoneId) return String(req.params.zoneId);
    /* Zone CRUD / map-image routes use :id under /api/vms/zones/ */
    if (req.params.id && String(req.originalUrl || req.url || '').indexOf('/api/vms/zones/') >= 0) {
        return String(req.params.id);
    }
    if (req.params.siteId) return null; // site-level — pass, tree filters per zone

    /* Fixed camera param */
    if (req.params.camId) {
        const cam = fixedCamRegistry.getById(req.params.camId);
        return (cam && cam.zone_id) || null;
    }

    /* Segment param — look up cam_id from DB */
    if (req.params.segmentId) {
        try {
            const { rows } = await siteDb.query(
                `SELECT cam_id FROM vms_recording_segments WHERE id = $1`,
                [req.params.segmentId]
            );
            if (!rows.length) return null;
            const cam = fixedCamRegistry.getById(rows[0].cam_id);
            return (cam && cam.zone_id) || null;
        } catch (_) {
            return null; // DB error — don't block; route handler will 404 itself
        }
    }

    return null;
}

async function requireZoneAccess(req, res, next) {
    const user = req.dashboardUser;
    if (!user) {
        return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    /* Super admin: always pass */
    if (isSuperAdmin(user)) return next();

    /* null/undefined allowedZones: unrestricted operator — pass */
    if (user.allowedZones == null) return next();

    /* Empty allowedZones array: fully restricted */
    if (!Array.isArray(user.allowedZones) || user.allowedZones.length === 0) {
        return res.status(403).json({ ok: false, error: 'Zone access restricted' });
    }

    /* Resolve the zone being accessed */
    const zoneId = await resolveZoneId(req);

    /* Cannot determine zone → pass (route handler will validate resource existence) */
    if (!zoneId) return next();

    if (!user.allowedZones.includes(zoneId)) {
        return res.status(403).json({
            ok: false, error: 'Access to this zone is restricted for your account',
        });
    }

    next();
}

module.exports = { requireZoneAccess };
