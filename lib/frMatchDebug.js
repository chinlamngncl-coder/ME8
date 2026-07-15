/**
 * mob-fr-match-debug-enroll-vs-live
 * Forced score: watchlist gallery (and fresh enroll represent) vs a live snap crop
 * using the same cosine % as live poller matchProbe.
 */
'use strict';

const path = require('path');
const frBlacklist = require('./frBlacklist');
const frSidecarClient = require('./frSidecarClient');
const frSnapLedger = require('./frSnapLedger');
const frLivePoller = require('./frLivePoller');

const BAR_PCT = 70;

function scorePct(a, b) {
    const sim = frBlacklist.cosineSimilarity(a, b);
    return Math.round(sim * 1000) / 10;
}

function embeddingMeta(emb) {
    if (!Array.isArray(emb) || emb.length < 64) {
        return { ok: false, dims: emb && emb.length ? emb.length : 0 };
    }
    return { ok: true, dims: emb.length };
}

function resolveCropPath(cropFile) {
    const name = cropFile ? path.basename(String(cropFile)) : '';
    if (!name) return null;
    const fromLedger = frSnapLedger.cropAbsolutePath(name);
    if (fromLedger) return { abs: fromLedger, cropFile: name, source: 'snap-ledger' };
    const fromLive = frLivePoller.cropAbsolutePath(name);
    if (fromLive) return { abs: fromLive, cropFile: name, source: 'live-crops' };
    return null;
}

function latestSnapCrop() {
    const rows = frSnapLedger.list({ limit: 1 });
    if (!rows || !rows.length) return null;
    const row = rows[0];
    const resolved = resolveCropPath(row.cropFile);
    if (!resolved) return null;
    return {
        abs: resolved.abs,
        cropFile: resolved.cropFile,
        source: resolved.source,
        camId: row.camId || null,
        at: row.at || null,
        deviceLabel: row.deviceLabel || null,
        ledgerScorePct: row.scorePct != null ? Number(row.scorePct) : null,
    };
}

/**
 * @param {{ entryId: string, cropFile?: string }} opts
 */
async function compareEnrollVsLive(opts) {
    const entryId = String((opts && opts.entryId) || '').trim();
    if (!entryId) {
        return { ok: false, error: 'need_entry', message: 'Watchlist entry id required' };
    }

    const entry = frBlacklist.getWithEmbedding(entryId);
    if (!entry) {
        return { ok: false, error: 'not_found', message: 'Watchlist entry not found' };
    }

    const galleryMeta = embeddingMeta(entry.embedding);
    if (!galleryMeta.ok) {
        return {
            ok: false,
            error: 'no_gallery_embedding',
            message: 'Entry has no usable gallery embedding — re-embed or re-enroll',
            entryId,
            displayName: entry.displayName || null,
        };
    }

    let crop = null;
    if (opts && opts.cropFile) {
        const resolved = resolveCropPath(opts.cropFile);
        if (!resolved) {
            return { ok: false, error: 'crop_missing', message: 'Crop file not found on disk' };
        }
        crop = {
            abs: resolved.abs,
            cropFile: resolved.cropFile,
            source: resolved.source,
            camId: null,
            at: null,
            deviceLabel: null,
            ledgerScorePct: null,
        };
        const rows = frSnapLedger.list({ limit: 50 });
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].cropFile === crop.cropFile) {
                crop.camId = rows[i].camId || null;
                crop.at = rows[i].at || null;
                crop.deviceLabel = rows[i].deviceLabel || null;
                crop.ledgerScorePct = rows[i].scorePct != null ? Number(rows[i].scorePct) : null;
                break;
            }
        }
    } else {
        crop = latestSnapCrop();
        if (!crop) {
            return {
                ok: false,
                error: 'no_live_crop',
                message: 'No live snap in ledger yet — Start watch and capture a face first',
                entryId,
                displayName: entry.displayName || null,
            };
        }
    }

    const ready = await frSidecarClient.ensureReady();
    if (!ready || !ready.ok) {
        return { ok: false, error: 'sidecar_down', message: 'Face service not ready', runtime: ready || null };
    }

    const engine = frSidecarClient.activeEngine();
    const model = process.env.FM_FR_MODEL || 'Facenet';

    const probe = await frSidecarClient.representProbePath(crop.abs, model);
    if (!probe || !probe.ok || !embeddingMeta(probe.embedding).ok) {
        return {
            ok: false,
            error: 'probe_failed',
            message: (probe && (probe.error || probe.message)) || 'Live crop probe failed',
            engine,
            cropFile: crop.cropFile,
            probe: probe || null,
        };
    }

    const galleryVsProbePct = scorePct(entry.embedding, probe.embedding);

    let enrollFreshVsProbePct = null;
    let enrollFreshVsGalleryPct = null;
    let enrollFreshDims = null;
    let enrollFreshError = null;
    const photoAbs = frBlacklist.photoAbsolutePath(entry);
    if (photoAbs) {
        const fresh = await frSidecarClient.representPath(photoAbs, model);
        if (fresh && fresh.ok && embeddingMeta(fresh.embedding).ok) {
            enrollFreshDims = fresh.embedding.length;
            enrollFreshVsProbePct = scorePct(fresh.embedding, probe.embedding);
            enrollFreshVsGalleryPct = scorePct(fresh.embedding, entry.embedding);
        } else {
            enrollFreshError = (fresh && (fresh.error || fresh.message)) || 'enroll_represent_failed';
        }
    } else {
        enrollFreshError = 'enroll_photo_missing';
    }

    const dimMismatch =
        galleryMeta.dims !== probe.embedding.length ||
        (enrollFreshDims != null && enrollFreshDims !== galleryMeta.dims);

    return {
        ok: true,
        engine,
        model,
        barPct: BAR_PCT,
        /** Primary — same path as live poller (gallery vector ↔ probe). */
        scorePct: galleryVsProbePct,
        clears70: galleryVsProbePct >= BAR_PCT,
        galleryVsProbePct,
        enrollFreshVsProbePct,
        enrollFreshVsGalleryPct,
        enrollFreshError,
        dimMismatch: !!dimMismatch,
        dims: {
            gallery: galleryMeta.dims,
            probe: probe.embedding.length,
            enrollFresh: enrollFreshDims,
        },
        entry: {
            id: entry.id,
            displayName: entry.displayName || null,
            engine: entry.engine || null,
            model: entry.model || null,
        },
        crop: {
            cropFile: crop.cropFile,
            source: crop.source,
            camId: crop.camId,
            at: crop.at,
            deviceLabel: crop.deviceLabel,
            ledgerScorePct: crop.ledgerScorePct,
            cropUrl: frSnapLedger.cropUrl(crop.cropFile) ||
                ('/api/analytics/fr/crop/' + encodeURIComponent(crop.cropFile)),
        },
    };
}

module.exports = {
    compareEnrollVsLive,
    BAR_PCT,
};
