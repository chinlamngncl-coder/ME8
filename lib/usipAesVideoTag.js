/**
 * AES-USIP-VIDEOTAG-V1 — ingest SIP VideoTag MESSAGE; unwrap DeviceTag.
 * AES-USIP-VIDEOTAG-SEND-ON-CALL-V1 — platform 下发 wrap string on AES call (not device ID).
 * Wrap key/IV from env or storage/secrets/usip-aes-wrap.json — never hardcoded.
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

function bufToB64Url(buf) {
    return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/** @type {Map<string, number>} */
const lastSendAtByCam = new Map();
const SEND_DEBOUNCE_MS = 2000;

/**
 * Wrap session key → DeviceTag. Never logs key material.
 * @returns {{ ok: boolean, deviceTag?: string, keyBuf?: Buffer, error?: string }}
 */
function wrapSessionKey(keyBuf) {
    if (!wrapConfigured || !wrapKeyBuf || !wrapIvBuf) {
        return { ok: false, error: 'wrap_secrets_missing' };
    }
    const plain = Buffer.isBuffer(keyBuf) ? keyBuf : Buffer.from(keyBuf || []);
    if (!plain.length) return { ok: false, error: 'empty_session_key' };
    try {
        const cipher = crypto.createCipheriv('aes-256-cbc', wrapKeyBuf, wrapIvBuf);
        const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
        const deviceTag = bufToB64Url(enc);
        if (!deviceTag || /^\d{10,32}$/.test(deviceTag)) {
            return { ok: false, error: 'wrap_looks_like_device_id' };
        }
        return { ok: true, deviceTag, keyBuf: Buffer.from(plain) };
    } catch (_) {
        return { ok: false, error: 'wrap_failed' };
    }
}

function buildVideoTagNotifyXml(deviceId, deviceTag, sn) {
    const id = String(deviceId || '').trim();
    const tag = String(deviceTag || '').trim();
    const snStr = String(sn || Date.now());
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<Notify>\n' +
        '<CmdType>VideoTag</CmdType>\n' +
        '<SN>' + snStr + '</SN>\n' +
        '<DeviceID>' + id + '</DeviceID>\n' +
        '<DeviceTag>' + tag + '</DeviceTag>\n' +
        '</Notify>'
    );
}

/**
 * One wrap + XML per AES call. Skip if secrets missing or same cam within 2s.
 * DeviceTag is never the camera ID.
 */
function prepareSendOnCall(camId) {
    const id = normalizeCamId(camId);
    if (!id) return { ok: false, skip: true, error: 'no_cam_id', path: 'AES-USIP-VIDEOTAG-SEND-ON-CALL-V1' };
    if (!wrapConfigured) {
        return { ok: false, skip: true, error: 'wrap_secrets_missing', path: 'AES-USIP-VIDEOTAG-SEND-ON-CALL-V1' };
    }
    const now = Date.now();
    const prev = lastSendAtByCam.get(id) || 0;
    if (now - prev < SEND_DEBOUNCE_MS) {
        return { ok: false, skip: true, error: 'debounced', path: 'AES-USIP-VIDEOTAG-SEND-ON-CALL-V1' };
    }
    const wrapped = wrapSessionKey(crypto.randomBytes(32));
    if (!wrapped.ok || !wrapped.deviceTag || !wrapped.keyBuf) {
        return { ok: false, skip: true, error: wrapped.error || 'wrap_failed', path: 'AES-USIP-VIDEOTAG-SEND-ON-CALL-V1' };
    }
    lastSendAtByCam.set(id, now);
    const updatedAt = new Date().toISOString();
    sessionByCam.set(id, {
        keyBuf: wrapped.keyBuf,
        updatedAt,
        tagLen: wrapped.deviceTag.length,
    });
    return {
        ok: true,
        camId: id,
        xml: buildVideoTagNotifyXml(id, wrapped.deviceTag, now),
        tagLen: wrapped.deviceTag.length,
        updatedAt,
        path: 'AES-USIP-VIDEOTAG-SEND-ON-CALL-V1',
    };
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
    wrapSessionKey,
    prepareSendOnCall,
    ingest,
    hasSessionKey,
    getSessionKey,
    getSessionMeta,
};
