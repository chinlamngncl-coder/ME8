/**
 * Evidence Overview aggregate — tolerates catalog failure; dock + fleet summary for dashboard.
 */
const fs = require('fs');
const path = require('path');
const dockSdkAdapter = require('./dockSdkAdapter');

async function safeCatalogFiles(siteDb, evidenceRegistry, operatorErrorVoice, limit) {
    try {
        if (!siteDb.isReady()) {
            return {
                available: false,
                files: [],
                error: operatorErrorVoice.jsonErr('Database not ready'),
            };
        }
        return {
            available: true,
            files: await evidenceRegistry.listCatalog(limit || 500),
        };
    } catch (err) {
        return {
            available: false,
            files: [],
            error: operatorErrorVoice.jsonErr(err),
        };
    }
}

async function build(ctx) {
    const settings = ctx.serverSettings.load(ctx.storageDir);
    const catWrap = await safeCatalogFiles(ctx.siteDb, ctx.evidenceRegistry, ctx.operatorErrorVoice, 500);
    const catalog = {
        available: catWrap.available,
        fileCount: null,
        dbBytes: null,
        evidenceBytes: null,
        engine: null,
    };
    if (!catWrap.available && catWrap.error) {
        catalog.errorKey = catWrap.error.errorKey;
        catalog.error = catWrap.error.error;
    } else if (catWrap.available) {
        try {
            const stats = await ctx.siteDb.getDatabaseStats();
            if (stats) {
                catalog.fileCount = stats.evidenceFileCount || 0;
                catalog.dbBytes = (stats.dbFileBytes || 0) + (stats.walFileBytes || 0);
                catalog.evidenceBytes = stats.evidenceTotalBytes || 0;
                catalog.engine = stats.engine || null;
            }
        } catch (err) {
            catalog.available = false;
            const j = ctx.operatorErrorVoice.jsonErr(err);
            catalog.errorKey = j.errorKey;
            catalog.error = j.error;
        }
    }

    let storage = { validation: {}, paths: {}, backups: { count: 0, latest: null } };
    try {
        const validation = ctx.storageStatus.pathValidation(ctx.baseDir, settings);
        const ftpRoot = ctx.storagePaths.resolveFtpRoot(ctx.baseDir, settings);
        const nasRaw = ctx.storagePaths.resolveNasMountPath(settings);
        const backupDir = path.join(ctx.storageDir, 'backups');
        let backupCount = 0;
        let latestBackup = null;
        if (fs.existsSync(backupDir)) {
            const files = fs.readdirSync(backupDir).filter(function (f) { return /\.pgdump$/i.test(f); });
            backupCount = files.length;
            if (files.length) {
                files.sort();
                latestBackup = files[files.length - 1];
            }
        }
        storage = {
            validation: validation,
            paths: {
                ftpLabel: ctx.storagePaths.displayPath(ftpRoot, ctx.baseDir),
                nasMountPath: nasRaw,
            },
            backups: { count: backupCount, latest: latestBackup },
        };
    } catch (_) { /* partial storage ok */ }

    const docks = ctx.dockRegistry.listDocks();
    const hints = ctx.evidenceWorkflow.ftpHintsForDocks(docks, catWrap.files);
    let baysTotal = 0;
    let baysOccupied = 0;
    let baysUploading = 0;
    let sitesOnline = 0;
    let sitesOffline = 0;
    const dockRows = docks.map(function (dock) {
        const layout = ctx.dockRegistry.bayStatesForDock(dock, hints);
        const telem = dockSdkAdapter.getDockTelemetry(dock, layout);
        baysTotal += layout.count;
        baysOccupied += telem.baysOccupied;
        baysUploading += telem.baysUploading;
        if (telem.linkState === 'online') sitesOnline += 1;
        else sitesOffline += 1;
        return {
            id: dock.id,
            displayName: dock.displayName,
            branchCode: dock.branchCode,
            location: [dock.city, dock.province].filter(Boolean).join(', '),
            hostIp: dock.hostIp || '',
            status: dock.status || 'offline',
            productCode: telem.productCode,
            model: telem.model,
            linkState: telem.linkState,
            sdkConnected: telem.sdkConnected,
            siteOnline: telem.siteOnline,
            bayPreset: dock.bayPreset,
            bayCount: layout.count,
            baysOccupied: telem.baysOccupied,
            baysUploading: telem.baysUploading,
            baysEmpty: layout.count - telem.baysOccupied,
            lastAuthOfficer: telem.lastAuthOfficer,
            lastAuthAt: telem.lastAuthAt,
            firmwareVersion: telem.firmwareVersion,
            telemetrySource: telem.source,
        };
    });

    ctx.syncFleetDeviceMeta();
    const fleet = ctx.fleetRegistry.getDashboardFleet();
    const bwcData = await ctx.loadBwcDevices();
    const registered = new Set();
    (bwcData.devices || []).forEach(function (d) {
        if (d && d.deviceId) registered.add(d.deviceId);
    });
    let fleetOnline = 0;
    fleet.forEach(function (d) {
        if (!d || !d.id || !d.online) return;
        if (registered.has(d.id)) fleetOnline += 1;
    });
    const fleetRegistered = registered.size;

    return {
        ok: true,
        catalog: catalog,
        storage: storage,
        docks: dockRows,
        dockTotals: {
            sites: docks.length,
            sitesOnline: sitesOnline,
            sitesOffline: sitesOffline,
            baysTotal: baysTotal,
            baysOccupied: baysOccupied,
            baysUploading: baysUploading,
        },
        fleet: {
            registered: fleetRegistered,
            online: fleetOnline,
            offline: Math.max(0, fleetRegistered - fleetOnline),
        },
        catalogHintsAvailable: catWrap.available,
    };
}

module.exports = {
    safeCatalogFiles: safeCatalogFiles,
    build: build,
};
