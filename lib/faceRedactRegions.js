/**
 * Convert a face-detection timeline (from the redaction-track sidecar) into
 * blur regions for the Evidence Hub editor.
 *
 * LEGACY (buildRegionsFromTimeline): merge overlapping samples into STATIC
 * time boxes for FFmpeg. Union boxes grow and over-blur — not ship-ready.
 *
 * FACE-FOLLOW PREVIEW (buildTightSampleRegions): few tight sample boxes for
 * operator review (mob-evidence-redact-auto-preview-slim-v1 — capped, not
 * one-per-sample flood). Burn uses sidecar per-frame path, not these boxes.
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

/**
 * Few short, tightly padded boxes — preview / review only.
 * mob-evidence-redact-auto-preview-slim-v1: cap + time-spread + size gate.
 * Does not union-grow over time (that caused “blur everything”).
 * Does not flood one box per sample (that caused Start/End spam).
 */
function buildTightSampleRegions(timeline, opts) {
    timeline = timeline || {};
    opts = opts || {};
    const pad = opts.pad != null && opts.pad >= 0 ? opts.pad : 0.10;
    const maxRegions = opts.maxRegions != null && opts.maxRegions > 0
        ? Math.min(40, Math.floor(opts.maxRegions))
        : 10;
    const width = timeline.width || 0;
    const height = timeline.height || 0;
    const fps = timeline.fps > 0 ? timeline.fps : 30;
    const stride = timeline.stride > 0 ? timeline.stride : 1;
    const sampleInterval = stride / fps;
    const hold = opts.holdSeconds != null ? opts.holdSeconds : Math.max(0.15, sampleInterval * 1.25);
    const maxWFrac = opts.maxWFrac != null ? opts.maxWFrac : 0.38;
    const maxHFrac = opts.maxHFrac != null ? opts.maxHFrac : 0.42;
    const maxAreaFrac = opts.maxAreaFrac != null ? opts.maxAreaFrac : 0.12;

    const frames = (timeline.frames || []).slice().sort(function (a, b) {
        return (a.t || 0) - (b.t || 0);
    });

    const candidates = [];
    frames.forEach(function (fr) {
        const t = fr.t || 0;
        (fr.boxes || []).forEach(function (b) {
            if (!(b.w > 0 && b.h > 0)) return;
            if (width && (b.w > width * maxWFrac || b.h > height * maxHFrac)) return;
            if (width && height && (b.w * b.h) > (width * height * maxAreaFrac)) return;
            const px = b.w * pad;
            const py = b.h * pad;
            const x = roundClamp(b.x - px, 0, width ? width - 1 : null);
            const y = roundClamp(b.y - py, 0, height ? height - 1 : null);
            const w = roundClamp(b.w + px * 2, 4, width ? width - x : null);
            const h = roundClamp(b.h + py * 2, 4, height ? height - y : null);
            if (w < 4 || h < 4) return;
            candidates.push({
                x: x,
                y: y,
                w: w,
                h: h,
                t0: Math.max(0, Number(t.toFixed(3))),
                t1: Number((t + hold).toFixed(3)),
                score: Number(b.score) > 0 ? Number(b.score) : 0,
                source: 'face-follow-preview',
            });
        });
    });

    if (!candidates.length) return [];

    /* Spread across clip time; prefer higher score within each slot. */
    candidates.sort(function (a, b) {
        if (a.t0 !== b.t0) return a.t0 - b.t0;
        return (b.score || 0) - (a.score || 0);
    });
    const tFirst = candidates[0].t0;
    const tLast = candidates[candidates.length - 1].t0;
    const span = Math.max(0.01, tLast - tFirst);
    const minGap = Math.max(0.35, span / Math.max(1, maxRegions));

    const picked = [];
    candidates.forEach(function (c) {
        if (picked.length >= maxRegions) return;
        const last = picked[picked.length - 1];
        if (last && (c.t0 - last.t0) < minGap) {
            /* Same time slot — keep higher score only. */
            if ((c.score || 0) > (last.score || 0) && Math.abs(c.t0 - last.t0) < 0.05) {
                picked[picked.length - 1] = c;
            }
            return;
        }
        picked.push(c);
    });

    /* If still under cap (sparse hits), fill with leftover spaced picks. */
    if (picked.length < maxRegions) {
        candidates.forEach(function (c) {
            if (picked.length >= maxRegions) return;
            const near = picked.some(function (p) {
                return Math.abs(p.t0 - c.t0) < minGap * 0.5;
            });
            if (!near) picked.push(c);
        });
        picked.sort(function (a, b) { return a.t0 - b.t0; });
        if (picked.length > maxRegions) picked.length = maxRegions;
    }

    return picked.map(function (c) {
        return {
            x: c.x,
            y: c.y,
            w: c.w,
            h: c.h,
            t0: c.t0,
            t1: c.t1,
            source: 'face-follow-preview',
        };
    });
}

module.exports = {
    buildRegionsFromTimeline: buildRegionsFromTimeline,
    buildTightSampleRegions: buildTightSampleRegions,
    _iou: iou,
    _unionBox: unionBox,
};
