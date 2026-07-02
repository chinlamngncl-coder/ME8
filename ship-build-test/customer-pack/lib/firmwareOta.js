/**
 * BWC firmware OTA — planning stub. Vendor model packs live under vendor/firmware-ota/.
 * Push/upgrade jobs are not wired until a model profile is embedded.
 */
const fs = require('fs');
const path = require('path');

const PHASES = [
    {
        id: 'inventory',
        step: 1,
        title: 'Review fleet versions',
        detail: 'Check which cameras are online and which firmware version each unit is running.',
    },
    {
        id: 'vendor-pack',
        step: 2,
        title: 'Confirm vendor package',
        detail: 'Your BWC vendor provides the approved firmware file and model registration for your cameras.',
    },
    {
        id: 'pilot',
        step: 3,
        title: 'Pilot one camera',
        detail: 'Run a test upgrade on a single online unit, then confirm the new version in this list.',
    },
    {
        id: 'batch',
        step: 4,
        title: 'Roll out to the fleet',
        detail: 'Schedule batch upgrades by map group or device selection when your vendor authorises fleet-wide push.',
    },
];

let vendorRoot = null;
let storageDir = null;

function init(opts) {
    const root = opts && opts.vendorRoot ? opts.vendorRoot : path.join(__dirname, '..', 'vendor', 'firmware-ota');
    vendorRoot = root;
    storageDir = opts && opts.storageDir ? opts.storageDir : null;
    const modelsDir = path.join(vendorRoot, 'models');
    fs.mkdirSync(modelsDir, { recursive: true });
    if (storageDir) {
        fs.mkdirSync(path.join(storageDir, 'firmware-ota', 'packages'), { recursive: true });
        fs.mkdirSync(path.join(storageDir, 'firmware-ota', 'jobs'), { recursive: true });
    }
}

function readJsonProfile(filePath) {
    try {
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (!raw || typeof raw !== 'object') return null;
        const id = String(raw.id || path.basename(filePath, '.json')).trim();
        if (!id) return null;
        return {
            id,
            vendor: String(raw.vendor || 'Unknown').trim(),
            model: String(raw.model || id).trim(),
            status: String(raw.status || 'draft').trim(),
            protocol: String(raw.protocol || 'vendor_specific').trim(),
            targetVersion: raw.targetVersion ? String(raw.targetVersion).trim() : null,
            notes: raw.notes ? String(raw.notes).trim() : '',
            packageFile: raw.packageFile ? String(raw.packageFile).trim() : null,
            match: raw.match && typeof raw.match === 'object' ? raw.match : {},
            source: path.relative(vendorRoot, filePath).replace(/\\/g, '/'),
        };
    } catch (_) {
        return null;
    }
}

function listVendorProfiles() {
    const modelsDir = path.join(vendorRoot || '', 'models');
    if (!vendorRoot || !fs.existsSync(modelsDir)) return [];
    const out = [];
    fs.readdirSync(modelsDir).forEach((name) => {
        if (!/\.json$/i.test(name)) return;
        const profile = readJsonProfile(path.join(modelsDir, name));
        if (profile) out.push(profile);
    });
    return out.sort((a, b) => a.vendor.localeCompare(b.vendor) || a.model.localeCompare(b.model));
}

function buildFleetInventory(fleetRegistry, bwcData) {
    const rows = typeof fleetRegistry.getFirmwareInventory === 'function'
        ? fleetRegistry.getFirmwareInventory()
        : [];
    const profiles = listVendorProfiles();
    return rows.map((row) => {
        const match = matchProfile(row.appversion, profiles);
        return Object.assign({}, row, {
            vendorProfileId: match ? match.id : null,
            vendorProfileLabel: match ? (match.vendor + ' ' + match.model) : null,
            otaReady: !!(match && match.status === 'ready' && match.packageFile),
        });
    });
}

function matchProfile(appversion, profiles) {
    const ver = String(appversion || '').trim();
    if (!ver || !profiles.length) return null;
    for (let i = 0; i < profiles.length; i++) {
        const p = profiles[i];
        const m = p.match || {};
        if (m.appversionPrefix && ver.startsWith(String(m.appversionPrefix))) return p;
        if (m.appversionContains && ver.includes(String(m.appversionContains))) return p;
        if (m.appversionRegex) {
            try {
                if (new RegExp(String(m.appversionRegex), 'i').test(ver)) return p;
            } catch (_) { /* ignore bad regex */ }
        }
    }
    return null;
}

function buildStatus(fleetRegistry, bwcData) {
    const profiles = listVendorProfiles();
    const readyProfiles = profiles.filter((p) => p.status === 'ready' && p.packageFile);
    const fleet = buildFleetInventory(fleetRegistry, bwcData);
    const reported = fleet.filter((r) => r.appversion);
    const distinctVersions = [...new Set(reported.map((r) => r.appversion).filter(Boolean))].sort();
    return {
        ok: true,
        phase: 'planning',
        otaEnabled: false,
        message: 'Firmware OTA (Please contact your Vendor)',
        phases: PHASES,
        vendorProfiles: profiles,
        vendorPackPath: 'vendor/firmware-ota/models/',
        packageStoragePath: storageDir ? 'storage/firmware-ota/packages/' : null,
        fleet,
        summary: {
            registered: fleet.length,
            online: fleet.filter((r) => r.online).length,
            reportedVersion: reported.length,
            distinctVersions,
            embeddedProfiles: profiles.length,
            readyProfiles: readyProfiles.length,
        },
        alternatives: {
            docking: 'Firmware can also be updated on the vendor docking station when officers return cameras at end of shift. Evidence upload from the dock uses FTP settings on the Server tab.',
        },
    };
}

module.exports = {
    init,
    listVendorProfiles,
    buildStatus,
    PHASES,
};
