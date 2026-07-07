/**
 * Gate B — proxy ZLM HTTP-FLV through dashboard origin (no browser hit on :8080).
 */
const http = require('http');
const https = require('https');
const zlmIngestLab = require('./zlmIngestLab');
const dashboardAuth = require('./dashboardAuth');
const log = require('./fleetLog');

const STREAM_FILE_RE = /^[\w.-]+\.live\.flv$/i;

function parseStreamFile(streamFile) {
    const raw = String(streamFile || '').trim();
    if (!STREAM_FILE_RE.test(raw)) return null;
    return raw.replace(/\.live\.flv$/i, '');
}

function requireLabFlvAccess(req, res, next) {
    const streamId = parseStreamFile(req.params && req.params.streamFile);
    if (!streamId) {
        return res.status(400).json({ ok: false, error: 'Invalid stream id' });
    }
    if (dashboardAuth.sessionFromRequest(req)) {
        return next();
    }
    const token = req.query && req.query.labFlv;
    if (zlmIngestLab.validateFlvToken(token, streamId)) {
        return next();
    }
    log.media.warn('zlm flv proxy denied', { streamId, reason: 'no_session_or_token' });
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
}

function proxyFlv(req, res, streamFile) {
    const streamId = parseStreamFile(streamFile);
    if (!streamId || streamId !== zlmIngestLab.streamIdForCam(streamId)) {
        return res.status(400).json({ ok: false, error: 'Invalid stream id' });
    }
    if (!zlmIngestLab.isEnabled()) {
        return res.status(503).json({ ok: false, error: 'ZLM disabled' });
    }

    const target = zlmIngestLab.flvUpstreamUrl(streamId);
    const transport = target.startsWith('https:') ? https : http;

    const upstreamReq = transport.get(target, (upstreamRes) => {
        if (upstreamRes.statusCode !== 200) {
            log.media.warn('zlm flv proxy upstream', {
                streamId,
                status: upstreamRes.statusCode,
            });
            res.status(upstreamRes.statusCode || 502).end();
            upstreamRes.resume();
            return;
        }
        res.setHeader('Content-Type', upstreamRes.headers['content-type'] || 'video/x-flv');
        res.setHeader('Cache-Control', 'no-cache, no-store');
        upstreamRes.pipe(res);
        log.media.info('zlm flv proxy open', { streamId });
    });

    upstreamReq.on('error', (err) => {
        log.media.warn('zlm flv proxy error', { streamId, message: err.message });
        if (!res.headersSent) {
            res.status(502).json({ ok: false, error: 'ZLM FLV unreachable' });
        }
    });

    upstreamReq.setTimeout(15000, () => {
        upstreamReq.destroy(new Error('upstream timeout'));
    });

    req.on('close', () => {
        try { upstreamReq.destroy(); } catch (_) { /* ignore */ }
    });
}

module.exports = {
    parseStreamFile,
    requireLabFlvAccess,
    proxyFlv,
};
