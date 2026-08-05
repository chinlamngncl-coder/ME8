/**
 * ANPR live tracker — dual-engine moving-target.
 * Live: YOLO vehicle track + keep top-3 sharpest/largest macros for temporal lock.
 * Exit: dual OCR on up to 3 keyframes (caller) → consensus + temporal majority.
 * Far tracks (never w>MIN_W) discarded.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const IOU_MATCH = Math.max(0.2, Math.min(0.8, parseFloat(process.env.FM_ANPR_TRACK_IOU || '0.35') || 0.35));
/** Track gone → force-flush. Default 1.0s (was 4.5s). Hatch: FM_ANPR_TRACK_MAX_AGE_MS=4500 */
const MAX_AGE_MS = Math.max(500, Math.min(20000, parseInt(process.env.FM_ANPR_TRACK_MAX_AGE_MS || '1000', 10) || 1000));
/**
 * ANPR-LIVE-CPU-BUDGET-SHARP-EMIT-V1 — if best macro still soft, wait up to this
 * from firstSeen before force-flush (cap mush SUV early emit).
 */
const SHARP_HOLD_MS = Math.max(MAX_AGE_MS, Math.min(5000,
    parseInt(process.env.FM_ANPR_SHARP_HOLD_MS || '2500', 10) || 2500));
const SHARP_HOLD_FLOOR = Math.max(5, Math.min(200,
    parseFloat(process.env.FM_ANPR_SHARP_HOLD_FLOOR || '35') || 35));
/**
 * ANPR-LIVE-GUARANTEED-CROP-EMIT-V1 — dwell flush does NOT require sharpness ≥ 35.
 * Default floor 0 = emit on dwell timer alone (stationary cars). Hatch: raise env to re-gate.
 */
const DWELL_MS = Math.max(1000, Math.min(15000,
    parseInt(process.env.FM_ANPR_DWELL_MS || '2500', 10) || 2500));
const DWELL_SHARP_FLOOR = Math.max(0, Math.min(200,
    parseFloat(process.env.FM_ANPR_DWELL_SHARP_FLOOR != null
        ? process.env.FM_ANPR_DWELL_SHARP_FLOOR
        : '0') || 0));
const MOVE_PX = Math.max(4, Math.min(80, parseInt(process.env.FM_ANPR_TRACK_MOVE_PX || '12', 10) || 12));
/** Stage-1 macro must reach this width at least once or the event is discarded (no Unclear). */
const MIN_MACRO_W = Math.max(40, parseInt(process.env.FM_ANPR_MIN_MACRO_W || '150', 10) || 150);
/** Temporal lock — keep last N best macros per track (default 3). */
const TEMPORAL_MACROS = Math.max(2, Math.min(5, parseInt(process.env.FM_ANPR_TEMPORAL_N || '3', 10) || 3));

let nextTrackId = 1;
let macrosDir = null;

/** @type {Map<string, object>} */
const tracks = new Map();

function setMacrosDir(dir) {
    macrosDir = dir || null;
    if (macrosDir) {
        try { fs.mkdirSync(macrosDir, { recursive: true }); } catch (_) { /* ignore */ }
    }
}

function bboxArea(b) {
    if (!b) return 0;
    const w = Number(b.w);
    const h = Number(b.h);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return 0;
    return w * h;
}

function iou(a, b) {
    if (!a || !b) return 0;
    const ax1 = Number(a.x) || 0;
    const ay1 = Number(a.y) || 0;
    const ax2 = ax1 + (Number(a.w) || 0);
    const ay2 = ay1 + (Number(a.h) || 0);
    const bx1 = Number(b.x) || 0;
    const by1 = Number(b.y) || 0;
    const bx2 = bx1 + (Number(b.w) || 0);
    const by2 = by1 + (Number(b.h) || 0);
    const ix1 = Math.max(ax1, bx1);
    const iy1 = Math.max(ay1, by1);
    const ix2 = Math.min(ax2, bx2);
    const iy2 = Math.min(ay2, by2);
    const iw = Math.max(0, ix2 - ix1);
    const ih = Math.max(0, iy2 - iy1);
    const inter = iw * ih;
    if (inter <= 0) return 0;
    const areaA = Math.max(0, ax2 - ax1) * Math.max(0, ay2 - ay1);
    const areaB = Math.max(0, bx2 - bx1) * Math.max(0, by2 - by1);
    const uni = areaA + areaB - inter;
    return uni > 0 ? inter / uni : 0;
}

function center(b) {
    return {
        cx: (Number(b.x) || 0) + (Number(b.w) || 0) / 2,
        cy: (Number(b.y) || 0) + (Number(b.h) || 0) / 2,
    };
}

function motionTag(track, bbox) {
    if (!track || !track.prevCenter || !bbox) return 'Stationary';
    const c = center(bbox);
    const dx = c.cx - track.prevCenter.cx;
    const dy = c.cy - track.prevCenter.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist >= MOVE_PX ? 'Moving' : 'Stationary';
}

/** Prefer largest bbox, then sharpest frame (Laplacian). */
function keyframeScore(bbox, sharpness) {
    const area = bboxArea(bbox);
    const sharp = Number.isFinite(Number(sharpness)) ? Math.max(0, Number(sharpness)) : 0;
    return area * (1 + Math.log1p(sharp));
}

function unlinkQuiet(p) {
    if (!p) return;
    try { fs.unlinkSync(p); } catch (_) { /* ignore */ }
}

function saveMacroB64(camId, trackId, b64) {
    if (!b64 || !macrosDir) return null;
    let buf;
    try {
        buf = Buffer.from(String(b64).replace(/^data:image\/\w+;base64,/, ''), 'base64');
    } catch (_) {
        return null;
    }
    if (!buf || buf.length < 200) return null;
    const name = 'macro_t' + trackId + '_' + String(camId).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 32)
        + '_' + crypto.randomBytes(4).toString('hex') + '.jpg';
    const abs = path.join(macrosDir, name);
    try {
        fs.writeFileSync(abs, buf);
        return abs;
    } catch (_) {
        return null;
    }
}

/**
 * Insert keyframe into track.macros (sorted by quality desc, max TEMPORAL_MACROS).
 */
function pushKeyframe(track, absPath, quality, sharpness, meta) {
    if (!absPath || !track) return;
    if (!Array.isArray(track.macros)) track.macros = [];
    track.macros.push({
        path: absPath,
        quality: quality,
        sharpness: sharpness || 0,
        at: (meta && meta.at) || track.at,
        frameUuid: (meta && meta.frameUuid) || track.frameUuid,
    });
    track.macros.sort((a, b) => (b.quality || 0) - (a.quality || 0));
    while (track.macros.length > TEMPORAL_MACROS) {
        const drop = track.macros.pop();
        if (drop && drop.path) unlinkQuiet(drop.path);
    }
    const best = track.macros[0];
    if (best) {
        track.bestMacroPath = best.path;
        track.bestQuality = best.quality;
        track.bestSharpness = best.sharpness;
        if (best.at) track.at = best.at;
        if (best.frameUuid) track.frameUuid = best.frameUuid;
    }
}

/**
 * Live observe — track-only (no plate OCR yet).
 * @param {string} camId
 * @param {object} bbox
 * @param {object} meta — { sharpness, vehicleJpegB64, vehicleLabel, frameUuid, deviceLabel, at }
 */
function observe(camId, bbox, meta) {
    const id = String(camId || '').trim();
    const now = Date.now();
    if (!id || !bbox || bboxArea(bbox) < 16) return null;

    let bestKey = null;
    let bestIou = 0;
    /* Match live tracks including already-emitted (dwell) so we do not re-open spam tracks */
    tracks.forEach((tr, key) => {
        if (tr.camId !== id) return;
        const score = iou(tr.bbox, bbox);
        if (score > bestIou) {
            bestIou = score;
            bestKey = key;
        }
    });

    let track;
    if (bestKey && bestIou >= IOU_MATCH) {
        track = tracks.get(bestKey);
    } else {
        const tid = nextTrackId++;
        track = {
            trackId: tid,
            camId: id,
            bbox: { x: bbox.x, y: bbox.y, w: bbox.w, h: bbox.h },
            prevCenter: center(bbox),
            bestQuality: -1,
            bestSharpness: 0,
            bestMacroPath: null,
            macros: [],
            maxWidth: 0,
            metMinWidth: false,
            firstSeen: now,
            lastSeen: now,
            emitted: false,
            flushed: false,
            motion: 'Stationary',
            deviceLabel: (meta && meta.deviceLabel) || id,
            vehicleLabel: (meta && meta.vehicleLabel) || null,
            frameUuid: (meta && meta.frameUuid) || null,
            at: (meta && meta.at) || new Date().toISOString(),
        };
        tracks.set(id + '|' + tid, track);
    }

    track.motion = motionTag(track, bbox);
    track.prevCenter = center(bbox);
    track.bbox = { x: bbox.x, y: bbox.y, w: bbox.w, h: bbox.h };
    track.lastSeen = now;
    if (meta && meta.deviceLabel) track.deviceLabel = meta.deviceLabel;
    if (meta && meta.vehicleLabel) track.vehicleLabel = meta.vehicleLabel;
    if (meta && meta.frameUuid) track.frameUuid = meta.frameUuid;

    const w = Number(bbox.w) || 0;
    if (w > track.maxWidth) track.maxWidth = w;
    if (w > MIN_MACRO_W) track.metMinWidth = true;

    /* Already dwell/exit flushed — keep alive for exit cleanup only, no more keyframes */
    if (track.emitted) {
        return { trackId: track.trackId, emitted: true };
    }

    const sharpness = meta && meta.sharpness != null ? Number(meta.sharpness) : 0;
    const q = keyframeScore(bbox, sharpness);
    /* Keep diverse keyframes: accept if better than worst of top-N or empty */
    const worst = track.macros && track.macros.length
        ? track.macros[track.macros.length - 1].quality
        : -1;
    const shouldSave = meta && meta.vehicleJpegB64 && (
        !track.macros.length
        || track.macros.length < TEMPORAL_MACROS
        || q > worst
        || q >= track.bestQuality
    );
    if (shouldSave) {
        const saved = saveMacroB64(id, track.trackId, meta.vehicleJpegB64);
        if (saved) pushKeyframe(track, saved, q, sharpness, meta);
    }

    return { trackId: track.trackId };
}

/**
 * Build harvest job or discard from a track (caller already marked emitted / deleted).
 * @param {object} tr
 * @param {'dwell'|'exit'} reason
 */
function jobFromTrack(tr, reason) {
    const paths = (tr.macros || [])
        .map((m) => m && m.path)
        .filter(Boolean);
    if (!tr.metMinWidth || !paths.length) {
        paths.forEach(unlinkQuiet);
        unlinkQuiet(tr.bestMacroPath);
        return {
            discard: true,
            trackId: tr.trackId,
            camId: tr.camId,
            reason: !tr.metMinWidth ? 'below_min_macro_w' : 'no_macro',
            maxWidth: tr.maxWidth,
            minMacroW: MIN_MACRO_W,
            flushReason: reason,
        };
    }
    return {
        discard: false,
        deferredSingleShot: true,
        dualTemporal: true,
        forceFlush: true,
        dwellFlush: reason === 'dwell',
        flushReason: reason,
        trackId: tr.trackId,
        camId: tr.camId,
        macroPath: paths[0],
        macroPaths: paths,
        motion: tr.motion || 'Stationary',
        sharpness: tr.bestSharpness || 0,
        bboxArea: bboxArea(tr.bbox),
        trackQuality: tr.bestQuality,
        maxWidth: tr.maxWidth,
        minMacroW: MIN_MACRO_W,
        deviceLabel: tr.deviceLabel,
        vehicleLabel: tr.vehicleLabel,
        frameUuid: tr.frameUuid,
        at: tr.at,
    };
}

/**
 * Tracks ready for OCR:
 *  - dwell: still in view, life ≥ DWELL_MS, sharp enough → once (stationary cars)
 *  - exit: left view (lastSeen aged), with sharp-hold for soft macros
 * Dwell keeps the track marked emitted (no delete) so the same car does not re-spam.
 * Exit deletes; if already dwell-emitted, cleanup only (no second OCR).
 * @returns {Array<object>}
 */
function harvestEmits() {
    const now = Date.now();
    const out = [];
    const keys = Array.from(tracks.keys());
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const tr = tracks.get(key);
        if (!tr) continue;

        const lifeMs = now - (tr.firstSeen || tr.lastSeen);
        const sharp = Number(tr.bestSharpness) || 0;
        const goneMs = now - tr.lastSeen;
        const stillInView = goneMs < MAX_AGE_MS;

        if (stillInView) {
            if (tr.emitted) continue;
            if (lifeMs < DWELL_MS) continue;
            /* Guaranteed crop: sharpness floor default 0 — do not block dwell */
            if (DWELL_SHARP_FLOOR > 0 && sharp < DWELL_SHARP_FLOOR) continue;
            /* Dwell flush once — keep track for IoU continuity / no re-open */
            tr.emitted = true;
            out.push(jobFromTrack(tr, 'dwell'));
            continue;
        }

        /* Exit: gone from view */
        if (tr.emitted) {
            /* Already published on dwell — drop quietly */
            (tr.macros || []).forEach((m) => unlinkQuiet(m && m.path));
            unlinkQuiet(tr.bestMacroPath);
            tracks.delete(key);
            continue;
        }
        /* Soft exit: still emit after SHARP_HOLD_MS life (do not silence forever) */
        if (sharp < SHARP_HOLD_FLOOR && lifeMs < SHARP_HOLD_MS) continue;
        tr.emitted = true;
        tracks.delete(key);
        out.push(jobFromTrack(tr, 'exit'));
    }
    return out;
}

function reset() {
    tracks.forEach((tr) => {
        (tr.macros || []).forEach((m) => unlinkQuiet(m && m.path));
        unlinkQuiet(tr.bestMacroPath);
    });
    tracks.clear();
    nextTrackId = 1;
}

function trackMapKey(camId, trackId) {
    return String(camId || '') + '|' + String(trackId || '');
}

/** Soft blur skip — keep macros + track; allow next harvest OCR immediately. */
function releaseBlurry(camId, trackId) {
    const tr = tracks.get(trackMapKey(camId, trackId));
    if (!tr) return false;
    tr.emitted = false;
    return true;
}

function markFlushed(camId, trackId) {
    const tr = tracks.get(trackMapKey(camId, trackId));
    if (!tr) return false;
    tr.flushed = true;
    tr.emitted = true;
    return true;
}

function isFlushed(camId, trackId) {
    const tr = tracks.get(trackMapKey(camId, trackId));
    return !!(tr && tr.flushed);
}

module.exports = {
    observe,
    harvestEmits,
    reset,
    setMacrosDir,
    releaseBlurry,
    markFlushed,
    isFlushed,
    bboxArea,
    keyframeScore,
    MIN_MACRO_W,
    MAX_AGE_MS,
    SHARP_HOLD_MS,
    SHARP_HOLD_FLOOR,
    DWELL_MS,
    DWELL_SHARP_FLOOR,
    TEMPORAL_MACROS,
};
