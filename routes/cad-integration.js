/**
 * CAD / RMS integration API (mock) — gated by air-gap features.cadIntegration.
 * MOB-APPLY 8.3-UNIFY-LICENSE-AND-CAD-MODULE-FINAL
 */
'use strict';

const express = require('express');
const licenseManager = require('../lib/licenseManager');

const router = express.Router();

const MOCK_INCIDENTS = [
    {
        id: 'CAD-1001',
        status: 'open',
        priority: 'P2',
        summary: 'Suspicious person — Main St / 4th Ave',
        reportedAt: '2026-07-28T02:15:00.000Z',
        units: ['BWC-12', 'BWC-18'],
    },
    {
        id: 'CAD-1002',
        status: 'dispatched',
        priority: 'P1',
        summary: 'Welfare check — Riverside Plaza',
        reportedAt: '2026-07-28T03:40:00.000Z',
        units: ['BWC-07'],
    },
    {
        id: 'CAD-1003',
        status: 'closed',
        priority: 'P3',
        summary: 'Noise complaint — Harbor District',
        reportedAt: '2026-07-27T22:05:00.000Z',
        units: [],
    },
];

function cadLicensed() {
    try {
        return !!licenseManager.hasFeature('cadIntegration');
    } catch (_) {
        return false;
    }
}

function requireCadLicense(req, res, next) {
    if (cadLicensed()) return next();
    return res.status(403).json({ error: 'Premium License Required' });
}

router.get('/incidents', requireCadLicense, function (req, res) {
    res.json({
        ok: true,
        incidents: MOCK_INCIDENTS,
    });
});

router.get('/status', function (req, res) {
    const licensed = cadLicensed();
    res.json({
        ok: true,
        licensed: licensed,
        module: 'cadIntegration',
    });
});

module.exports = router;
