/**
 * AES-USIP-VIDEOTAG-V1 — ingest SIP VideoTag MESSAGE; unwrap DeviceTag (A1 only).
 * Wrap key/IV from env or storage/secrets/usip-aes-wrap.json — never hardcoded.
 * File decrypt (*-AES.*) = AES-USIP-FILE-DECRYPT-V1 (next).
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/** @type {Map<string, { keyBuf: Buffer, updatedAt: string, tagLen: number }>} */
const sessionByCam = new Map();

let wrapKeyBuf = null;
let wrapIvBuf = null;
let wrapConfigured = false;
let logRef = null;
let secretsPath = null;

function init(opts) {
    const o = opts || {};
    logRef = o.log || null;
    const storageDir = o.storageDir || o.root || null;
    if (storageDir) {
        secretsPath = path.join(path.resolve(storageDir), 'secrets', 'usip-aes-wrap.json');
    }
    reloadWrapSecrets();
    return { configured: wrapConfigured, secretsPath: secretsPath || null };
}

function reloadWrapSecrets() {
    wrapKeyBuf = null;
    wrapIvBuf = null;
    wrapConfigured = false;
    let keyStr = String(process.env.FM_USIP_AES_WRAP_KEY || '').trim();
    let ivStr = String(process.env.FM_USIP_AES_WRAP_IV || '').trim();
    if ((!keyStr || !ivStr) && secretsPath) {
        try {
            if (fs.existsSync(secretsPath)) {
                const raw = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
                if (!keyStr && raw && raw.wrapKey) keyStr = String(raw.wrapKey).trim();
                if (!ivStr && raw && raw.wrapIv) ivStr = String(raw.wrapIv).trim();
            }
        } catch (_) { /* ignore */ }
    }
    if (!keyStr || !ivStr) {
        if (logRef && logRef.sip && typeof logRef.sip.warn === 'function') {
            logRef.sip.warn('usip aes wrap secrets missing', {
                path: 'AES-USIP-VIDEOTAG-V1',
                hint: 'set FM_USIP_AES_WRAP_KEY + FM_USIP_AES_WRAP_IV or storage/secrets/usip-aes-wrap.json',
            });
        }
        return false;
    }
    const keyBuf = Buffer.from(keyStr, 'utf8');
    const ivBuf = Buffer.from(ivStr, 'utf8');
    if (keyBuf.length !== 32 || ivBuf.length !== 16) {
        if (logRef && logRef.sip && typeof logRef.sip.warn === 'function') {
            logRef.sip.warn('usip aes wrap secrets bad length', {
                path: 'AES-USIP-VIDEOTAG-V1',
                keyBytes: keyBuf.length,
                ivBytes: ivBuf.length,
                need: 'key 32 utf8 bytes, iv 16 utf8 bytes',
            });
        }
        return false;
    }
    wrapKeyBuf = keyBuf;
    wrapIvBuf = ivBuf;
    wrapConfigured = true;
    return true;
}

function isConfigured() {
    return wrapConfigured;
}

function parseVideoTagXml(rawXml) {
    const xml = String(rawXml || '');
    const cmdM = xml.match(/<CmdType>\s*([^<]+)\s*<\/CmdType>/i);
    const cmd = cmdM ? String(cmdM[1]).trim() : '';
    if (cmd.toLowerCase() !== 'videotag') return null;
    const tagM = xml.match(/<DeviceTag>\s*([^<]+)\s*<\/DeviceTag>/i);
    const idM = xml.match(/<DeviceID>\s*([^<]+)\s*<\/DeviceID>/i);
    const snM = xml.match(/<SN>\s*([^<]+)\s*<\/SN>/i);
    const deviceTag = tagM ? String(tagM[1]).trim() : '';
    const deviceId = idM ? String(idM[1]).trim() : '';
    if (!deviceTag) return null;
    return {
        cmdType: cmd,
        deviceTag,
        deviceId: deviceId || null,
        sn: snM ? String(snM[1]).trim() : null,
    };
}

function b64UrlToBuf(s) {
    let t = String(s || '').trim().replace(/-/g, '+').replace(/_/g, '/');
    const pad = t.length % 4;
    if (pad) t += '===='.slice(pad);
    return Buffer.from(t, 'base64');
}

/**
 * Unwrap DeviceTag → session key bytes. Does not log key material.
 * @returns {{ ok: boolean, keyBuf?: Buffer, error?: string }}
 */
function unwrapDeviceTag(deviceTag) {
    if (!wrapConfigured || !wrapKeyBuf || !wrapIvBuf) {
        return { ok: false, error: 'wrap_secrets_missing' };
    }
    const tag = String(deviceTag || '').trim();
    if (!tag) return { ok: false, error: 'empty_tag' };
    let cipherBuf;
    try {
        cipherBuf = b64UrlToBuf(tag);
    } catch (_) {
        return { ok: false, error: 'tag_b64_bad' };
    }
    if (!cipherBuf.length) return { ok: false, error: 'tag_empty_cipher' };
    try {
        const decipher = crypto.createDecipheriv('aes-256-cbc', wrapKeyBuf, wrapIvBuf);
        const plain = Buffer.concat([decipher.update(cipherBuf), decipher.final()]);
        if (!plain.length) return { ok: false, error: 'unwrap_empty' };
        return { ok: true, keyBuf: plain };
    } catch (_) {
        return { ok: false, error: 'unwrap_failed' };
    }
}

function normalizeCamId(raw) {
    const s = String(raw || '').trim();
    if (!s) return null;
    const digits = s.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 32) return digits.length === 20 ? digits : s;
    return s;
}

/**
 * @param {object} opts
 * @param {string} [opts.camId]
 * @param {string} [opts.xml]
 * @param {string} [opts.deviceTag]
 * @param {string} [opts.source]
 */
function ingest(opts) {
    const o = opts || {};
    const parsed = o.xml ? parseVideoTagXml(o.xml) : null;
    const deviceTag = String(o.deviceTag || (parsed && parsed.deviceTag) || '').trim();
    let camId = normalizeCamId(o.camId || (parsed && parsed.deviceId) || '');
    if (!camId && deviceTag && /^\d{10,32}$/.test(deviceTag)) {
        camId = deviceTag;
    }
    if (!deviceTag) {
        return { ok: false, error: 'no_device_tag', path: 'AES-USIP-VIDEOTAG-V1' };
    }
    if (!camId) {
        return { ok: false, error: 'no_cam_id', path: 'AES-USIP-VIDEOTAG-V1' };
    }

    /* SDK sample sometimes shows GB digits in DeviceTag — not a wrap payload */
    if (/^\d{10,32}$/.test(deviceTag) && !/[A-Za-z_-]/.test(deviceTag)) {
        if (logRef && logRef.sip && typeof logRef.sip.info === 'function') {
            logRef.sip.info('usip videotag placeholder (no wrap payload)', {
                camId,
                tagLen: deviceTag.length,
                path: 'AES-USIP-VIDEOTAG-V1',
            });
        }
        return { ok: true, camId, placeholder: true, path: 'AES-USIP-VIDEOTAG-V1' };
    }

    const un = unwrapDeviceTag(deviceTag);
    if (!un.ok) {
        if (logRef && logRef.sip && typeof logRef.sip.warn === 'function') {
            logRef.sip.warn('usip videotag unwrap failed', {
                camId,
                error: un.error,
                tagLen: deviceTag.length,
                configured: wrapConfigured,
                path: 'AES-USIP-VIDEOTAG-V1',
            });
        }
        return { ok: false, camId, error: un.error, path: 'AES-USIP-VIDEOTAG-V1' };
    }

    const updatedAt = new Date().toISOString();
    sessionByCam.set(String(camId), {
        keyBuf: un.keyBuf,
        updatedAt,
        tagLen: deviceTag.length,
    });
    if (logRef && logRef.sip && typeof logRef.sip.info === 'function') {
        logRef.sip.info('usip videotag session key stored', {
            camId,
            keyBytes: un.keyBuf.length,
            tagLen: deviceTag.length,
            source: o.source || null,
            path: 'AES-USIP-VIDEOTAG-V1',
        });
    }
    return {
        ok: true,
        camId,
        keyBytes: un.keyBuf.length,
        updatedAt,
        path: 'AES-USIP-VIDEOTAG-V1',
    };
}

function hasSessionKey(camId) {
    return sessionByCam.has(String(camId || '').trim());
}

/** Returns a copy of key bytes; caller must not log. */
function getSessionKey(camId) {
    const row = sessionByCam.get(String(camId || '').trim());
    if (!row || !row.keyBuf) return null;
    return Buffer.from(row.keyBuf);
}

function getSessionMeta(camId) {
    const row = sessionByCam.get(String(camId || '').trim());
    if (!row) return null;
    return {
        camId: String(camId),
        updatedAt: row.updatedAt,
        keyBytes: row.keyBuf.length,
        tagLen: row.tagLen,
    };
}

module.exports = {
    init,
    reloadWrapSecrets,
    isConfigured,
    parseVideoTagXml,
    unwrapDeviceTag,
    ingest,
    hasSessionKey,
    getSessionKey,
    getSessionMeta,
};
