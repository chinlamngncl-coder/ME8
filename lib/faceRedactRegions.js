/**
 * Convert a face-detection timeline (from the redaction-track sidecar) into
 * static blur regions the existing redaction pipeline understands.
 *
 * The redaction filter (evidenceWorkflow.buildRedactFilterComplex) only blurs a
 * STATIC rectangle over a time window (enable='between(t,t0,t1)'). A moving face
 * is covered by "segmented static boxes": consecutive detections that overlap in
 * space and time are merged into one track; each track becomes one padded box
 * spanning [t0, t1]. Tracks are capped in duration so a fast-moving subject does
 * not grow one box to cover the whole frame.
 *
 * Output region shape matches evidenceWorkflow.validateRedactRegions:
 *   { x, y, w, h, t0, t1 }  (pixel coords in the source video's native size)
 *
 * Pure/deterministic — no I/O, no side effects.
 */
'use strict';

function roundClamp(v, min, max) {
    v = Math.round(v);
    if (v < min) v = min;
    if (max != null && v > max) v = max;
    return v;
}

function iou(a, b) {
    const ix = Math.max(a.x, b.x);
    const iy = Math.max(a.y, b.y);
    const ix2 = Math.min(a.x + a.w, b.x + b.w);
    const iy2 = Math.min(a.y + a.h, b.y + b.h);
    const iw = Math.max(0, ix2 - ix);
    const ih = Math.max(0, iy2 - iy);
    const inter = iw * ih;
    const uni = (a.w * a.h) + (b.w * b.h) - inter;
    return uni > 0 ? inter / uni : 0;
}

function unionBox(a, b) {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const x2 = Math.max(a.x + a.w, b.x + b.w);
    const y2 = Math.max(a.y + a.h, b.y + b.h);
    return { x: x, y: y, w: x2 - x, h: y2 - y };
}

function buildRegionsFromTimeline(timeline, opts) {
    timeline = timeline || {};
    opts = opts || {};
    const pad = opts.pad != null && opts.pad >= 0 ? opts.pad : 0.25;
    const iouThresh = opts.iouThresh != null ? opts.iouThresh : 0.2;
    const maxTrackSeconds = opts.maxTrackSeconds || 1.5;
    const maxRegions = opts.maxRegions || 600;

    const width = timeline.width || 0;
    const height = timeline.height || 0;
    const fps = timeline.fps > 0 ? timeline.fps : 30;
    const stride = timeline.stride > 0 ? timeline.stride : 1;
    const sampleInterval = stride / fps;
    const holdSeconds = opts.holdSeconds != null ? opts.holdSeconds : sampleInterval * 2;
    const gap = sampleInterval + holdSeconds;

    const frames = (timeline.frames || []).slice().sort(function (a, b) {
        return (a.t || 0) - (b.t || 0);
    });

    let active = [];
    const done = [];

    frames.forEach(function (fr) {
        const t = fr.t || 0;
        for (let i = active.length - 1; i >= 0; i -= 1) {
            if (t - active[i].lastT > gap || t - active[i].t0 > maxTrackSeconds) {
                done.push(active[i]);
                active.splice(i, 1);
            }
        }
        (fr.boxes || []).forEach(function (b) {
            if (!(b.w > 0 && b.h > 0)) return;
            const box = { x: b.x, y: b.y, w: b.w, h: b.h };
            let best = -1;
            let bestIou = iouThresh;
            for (let i = 0; i < active.length; i += 1) {
                const v = iou(active[i].bounds, box);
                if (v >= bestIou) { bestIou = v; best = i; }
            }
            if (best >= 0) {
                active[best].bounds = unionBox(active[best].bounds, box);
                active[best].lastT = t;
            } else {
                active.push({ bounds: box, t0: t, lastT: t });
            }
        });
    });
    active.forEach(function (trk) { done.push(trk); });

    let regions = done.map(function (trk) {
        const b = trk.bounds;
        const px = b.w * pad;
        const py = b.h * pad;
        const x = roundClamp(b.x - px, 0, width ? width - 1 : null);
        const y = roundClamp(b.y - py, 0, height ? height - 1 : null);
        const w = roundClamp(b.w + px * 2, 4, width ? width - x : null);
        const h = roundClamp(b.h + py * 2, 4, height ? height - y : null);
        const t0 = Math.max(0, Number(trk.t0.toFixed(3)));
        const t1 = Number((trk.lastT + gap).toFixed(3));
        return { x: x, y: y, w: w, h: h, t0: t0, t1: t1 };
    }).filter(function (r) {
        return r.w >= 4 && r.h >= 4 && r.t1 > r.t0;
    });

    regions.sort(function (a, b) { return a.t0 - b.t0; });
    if (regions.length > maxRegions) regions = regions.slice(0, maxRegions);
    return regions;
}

module.exports = {
    buildRegionsFromTimeline: buildRegionsFromTimeline,
    _iou: iou,
    _unionBox: unionBox,
};
