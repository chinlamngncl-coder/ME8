'use strict';

/**
 * msgWss device auth — SEC-MSGWSS-HMAC-AUTH-V1
 *
 * Token = hex(HMAC-SHA256(serverSecret, camId + "\\n" + devicePassword))
 * URL:  ws://host:port/?user=CAM_ID&token=HEX
 */

const crypto = require('crypto');

function normalizeSecret(serverSecret) {
    return String(serverSecret || '').trim();
}

function computeToken(camId, devicePassword, serverSecret) {
    const secret = normalizeSecret(serverSecret);
    const id = String(camId || '').trim();
    if (!secret || !id) return null;
    return crypto
        .createHmac('sha256', secret)
        .update(id + '\n' + String(devicePassword || ''), 'utf8')
        .digest('hex');
}

/** Same pattern as companion timing-safe compare (equal-length digests). */
function secureEqual(actual, expected) {
    if (!actual || !expected) return false;
    const a = crypto.createHash('sha256').update(String(actual), 'utf8').digest();
    const b = crypto.createHash('sha256').update(String(expected), 'utf8').digest();
    return crypto.timingSafeEqual(a, b);
}

function extractTokenFromUrl(rawUrl) {
    const m = String(rawUrl || '').match(/[?&]token=([^&'\s]+)/i);
    if (!m) return '';
    try {
        return decodeURIComponent(String(m[1] || '').trim());
    } catch (_) {
        return String(m[1] || '').trim();
    }
}

function buildDeviceUrl(opts) {
    const host = String((opts && opts.host) || '').trim();
    const port = Number(opts && opts.port);
    const camId = String((opts && opts.camId) || '').trim();
    const base = `ws://${host}:${port}`;
    if (!camId) return base;
    const token = computeToken(camId, opts && opts.devicePassword, opts && opts.serverSecret);
    if (!token) return `${base}/?user=${encodeURIComponent(camId)}`;
    return `${base}/?user=${encodeURIComponent(camId)}&token=${encodeURIComponent(token)}`;
}

function verifyConnectionToken(opts) {
    const requireToken = !!(opts && opts.requireToken);
    const provided = String((opts && opts.providedToken) || '').trim();
    const expected = computeToken(
        opts && opts.camId,
        opts && opts.devicePassword,
        opts && opts.serverSecret,
    );
    if (!requireToken) {
        if (!provided) return { ok: true, skipped: true };
        if (!expected) return { ok: false, reason: 'secret_missing' };
        return secureEqual(provided, expected) ? { ok: true } : { ok: false, reason: 'bad_token' };
    }
    if (!expected) return { ok: false, reason: 'secret_missing' };
    if (!provided) return { ok: false, reason: 'missing_token' };
    return secureEqual(provided, expected) ? { ok: true } : { ok: false, reason: 'bad_token' };
}

module.exports = {
    computeToken,
    secureEqual,
    extractTokenFromUrl,
    buildDeviceUrl,
    verifyConnectionToken,
};
