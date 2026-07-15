/**
 * mob-fr-enroll-from-bwc-still
 * Enroll watchlist person from a durable BWC face snap (same domain as live match).
 */
'use strict';

const path = require('path');
const frBlacklist = require('./frBlacklist');
const frSidecarClient = require('./frSidecarClient');
const frSnapLedger = require('./frSnapLedger');
const frLivePoller = require('./frLivePoller');
const frEnrollQuality = require('./frEnrollQuality');

function resolveCrop(cropFile) {
    const name = cropFile ? path.basename(String(cropFile)) : '';
    if (name) {
        const fromLedger = frSnapLedger.cropAbsolutePath(name);
        if (fromLedger) {
            return { abs: fromLedger, cropFile: name, source: 'snap-ledger', meta: metaForCrop(name) };
        }
        const fromLive = frLivePoller.cropAbsolutePath(name);
        if (fromLive) {
            return { abs: fromLive, cropFile: name, source: 'live-crops', meta: metaForCrop(name) };
        }
        return null;
    }
    const rows = frSnapLedger.list({ limit: 1 });
    if (!rows || !rows.length) return null;
    const row = rows[0];
    const abs = frSnapLedger.cropAbsolutePath(row.cropFile);
    if (!abs) return null;
    return {
        abs,
        cropFile: row.cropFile,
        source: 'snap-ledger',
        meta: {
            camId: row.camId || null,
            at: row.at || null,
            deviceLabel: row.deviceLabel || null,
        },
    };
}

function metaForCrop(cropFile) {
    const rows = frSnapLedger.list({ limit: 80 });
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].cropFile === cropFile) {
            return {
                camId: rows[i].camId || null,
                at: rows[i].at || null,
                deviceLabel: rows[i].deviceLabel || null,
            };
        }
    }
    return { camId: null, at: null, deviceLabel: null };
}

/**
 * @param {object} body displayName, cropFile?, notes, listStatus, …
 * @param {string} actor
 */
async function enrollFromBwcStill(body, actor) {
    const displayName = String((body && body.displayName) || '').trim();
    if (!displayName) {
        return { ok: false, error: 'need_name', code: 'fr.need_name', message: 'Display name required' };
    }

    const crop = resolveCrop(body && body.cropFile);
    if (!crop) {
        return {
            ok: false,
            error: 'no_live_crop',
            code: 'fr.bad_file',
            message: 'No BWC face snap yet — Start watch and capture a face first',
        };
    }

    const sizeGate = frEnrollQuality.checkBwcStillEnrollFile(crop.abs);
    if (!sizeGate.ok) {
        return {
            ok: false,
            error: 'image_gate',
            code: sizeGate.code === 'fr.image_too_small' ? 'fr.image_too_small' : 'fr.bad_file',
            message: 'BWC face snap too small or unreadable — wait for a clearer crop',
            gate: sizeGate,
        };
    }

    const ready = await frSidecarClient.ensureReady();
    if (!ready || !ready.ok) {
        return { ok: false, error: 'sidecar_down', code: 'fr.failed', message: 'Face service not ready' };
    }

    const model = (body && body.model) || process.env.FM_FR_MODEL || 'Facenet';
    const rep = await frSidecarClient.representPath(crop.abs, model);
    if (!rep || rep.ok === false || !Array.isArray(rep.embedding)) {
        return {
            ok: false,
            error: 'represent_failed',
            code: (rep && rep.code) || 'fr.failed',
            message: (rep && (rep.error || rep.message)) || 'Could not read a face from this BWC snap',
            probe: rep || null,
        };
    }

    const meta = crop.meta || {};
    const tag = '[BWC still · ' + crop.cropFile
        + (meta.deviceLabel || meta.camId ? ' · ' + (meta.deviceLabel || meta.camId) : '')
        + ']';
    const notesIn = String((body && body.notes) || '').trim();
    const notes = (notesIn ? (notesIn + ' ') : '') + tag;
    const lastSeen = String((body && body.lastSeen) || '').trim()
        || (meta.deviceLabel || meta.camId
            ? String(meta.deviceLabel || meta.camId) + (meta.at ? ' · ' + meta.at : '')
            : '');

    const enrolled = frBlacklist.enroll({
        displayName,
        idNumber: body && body.idNumber,
        notes: notes.slice(0, 500),
        listStatus: body && body.listStatus,
        reasonCode: body && body.reasonCode,
        reasonOther: body && body.reasonOther,
        lastSeen: lastSeen.slice(0, 200),
        lastIncident: body && body.lastIncident,
        embedding: rep.embedding,
        model: rep.model || model,
        engine: frSidecarClient.activeEngine(),
        photoPath: crop.abs,
        enrolledBy: actor || '',
        enrollSource: 'bwc-still',
        sourceCropFile: crop.cropFile,
    });

    if (!enrolled.ok) {
        return {
            ok: false,
            error: enrolled.code || 'failed',
            code: enrolled.code || 'fr.failed',
            message: enrolled.code === 'fr.blacklist_full' ? 'Watchlist full' : 'Enroll failed',
        };
    }

    return {
        ok: true,
        entry: enrolled.entry,
        count: frBlacklist.list().count,
        cropFile: crop.cropFile,
        cropSource: crop.source,
        camId: meta.camId || null,
        deviceLabel: meta.deviceLabel || null,
        engine: frSidecarClient.activeEngine(),
    };
}

module.exports = {
    enrollFromBwcStill,
    resolveCrop,
};
