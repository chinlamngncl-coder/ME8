/**
 * PTT-SOS-INCIDENT-AUDIO-V1 — tee SOS-proximity PTT talk to Evidence WAV.
 * Server gates calls to SOS team members only. Fail-open: never throw into live PTT.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { alawToPcm16 } = require('./psG711Audio');

const MIN_PCM_BYTES = 8000; /* ~0.5s @ 8kHz 16-bit mono */
const MAX_PCM_BYTES = 8 * 8000 * 2 * 60; /* ~8 min hard cap per burst */
const IDLE_FLUSH_MS = 1200;

let storageDir = null;
let log = null;
let evidenceRegistry = null;
let evidenceIngestGate = null;
let evidenceCrypto = null;
let enabled = true;

/** @type {Map<string, object>} */
const sessions = new Map();

function isEnabled() {
    if (!enabled) return false;
    const env = String(process.env.FM_PTT_EVIDENCE_RECORD || '1').trim();
    if (env === '0' || /^false$/i.test(env) || /^off$/i.test(env)) return false;
    return !!(storageDir && evidenceRegistry);
}

function init(opts) {
    storageDir = opts && opts.storageDir ? String(opts.storageDir) : null;
    log = opts && opts.log ? opts.log : null;
    evidenceRegistry = opts && opts.evidenceRegistry ? opts.evidenceRegistry : null;
    evidenceIngestGate = opts && opts.evidenceIngestGate ? opts.evidenceIngestGate : null;
    evidenceCrypto = opts && opts.evidenceCrypto ? opts.evidenceCrypto : null;
    enabled = opts && opts.enabled === false ? false : true;
}

function rootDir() {
    if (!storageDir) return null;
    const live = evidenceRegistry && typeof evidenceRegistry.getLiveCaptureRoot === 'function'
        ? evidenceRegistry.getLiveCaptureRoot()
        : null;
    const ftp = evidenceRegistry && typeof evidenceRegistry.getFtpRoot === 'function'
        ? evidenceRegistry.getFtpRoot()
        : null;
    return live || ftp || path.join(storageDir, 'ftp-uploads');
}

function sessionKey(direction, id) {
    return String(direction || 'hq') + ':' + String(id || 'unknown');
}

function begin(key, meta) {
    if (!isEnabled() || !key) return;
    try {
        const existing = sessions.get(key);
        if (existing) {
            existing.meta = Object.assign({}, existing.meta, meta || {});
            return;
        }
        sessions.set(key, {
            key,
            pcmParts: [],
            pcmBytes: 0,
            startedAt: new Date().toISOString(),
            meta: Object.assign({ direction: 'hq' }, meta || {}),
            flushTimer: null,
            finalizing: false,
        });
    } catch (err) {
        if (log && log.ptt) log.ptt.warn('ptt evidence begin failed', { message: err && err.message });
    }
}

function appendAlaw(key, alawBuf) {
    if (!isEnabled() || !key || !alawBuf || !alawBuf.length) return;
    try {
        let sess = sessions.get(key);
        if (!sess) {
            begin(key, { direction: 'field' });
            sess = sessions.get(key);
        }
        if (!sess || sess.finalizing) return;
        if (sess.pcmBytes >= MAX_PCM_BYTES) return;
        const pcm = alawToPcm16(Buffer.isBuffer(alawBuf) ? alawBuf : Buffer.from(alawBuf));
        if (!pcm || !pcm.length) return;
        const room = MAX_PCM_BYTES - sess.pcmBytes;
        const slice = pcm.length > room ? pcm.subarray(0, room) : pcm;
        sess.pcmParts.push(Buffer.from(slice));
        sess.pcmBytes += slice.length;
        if (sess.flushTimer) clearTimeout(sess.flushTimer);
        /* Field bursts already end via onPttRxState; soft idle for safety. */
        if (sess.meta && sess.meta.direction === 'field') {
            sess.flushTimer = setTimeout(function () {
                end(key);
            }, IDLE_FLUSH_MS);
        }
    } catch (err) {
        if (log && log.ptt) log.ptt.warn('ptt evidence append failed', { message: err && err.message });
    }
}

function end(key) {
    if (!key) return;
    const sess = sessions.get(key);
    if (!sess || sess.finalizing) return;
    sess.finalizing = true;
    if (sess.flushTimer) {
        clearTimeout(sess.flushTimer);
        sess.flushTimer = null;
    }
    sessions.delete(key);
    setImmediate(function () {
        finalizeSession(sess).catch(function (err) {
            if (log && log.ptt) log.ptt.warn('ptt evidence finalize failed', { message: err && err.message });
        });
    });
}

function buildWav(pcmBuf) {
    const dataSize = pcmBuf.length;
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); /* PCM */
    header.writeUInt16LE(1, 22); /* mono */
    header.writeUInt32LE(8000, 24);
    header.writeUInt32LE(8000 * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);
    return Buffer.concat([header, pcmBuf]);
}

async function finalizeSession(sess) {
    if (!isEnabled() || !sess) return null;
    if (sess.pcmBytes < MIN_PCM_BYTES || !sess.pcmParts.length) return null;
    const root = rootDir();
    if (!root) return null;
    const camIds = Array.isArray(sess.meta.camIds) ? sess.meta.camIds.filter(Boolean) : [];
    const deviceId = String(sess.meta.deviceId || camIds[0] || 'ptt').trim() || 'ptt';
    const direction = sess.meta.direction === 'field' ? 'field' : 'hq';
    const day = (sess.startedAt || new Date().toISOString()).slice(0, 10);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeDev = deviceId.replace(/[^\w.-]+/g, '_').slice(0, 48);
    const fileName = 'PTT-' + direction + '-' + safeDev + '-' + stamp + '.wav';
    const relDir = path.join('ptt-audio', day, safeDev);
    const absDir = path.join(root, relDir);
    fs.mkdirSync(absDir, { recursive: true });
    const fullPath = path.join(absDir, fileName);
    const pcm = Buffer.concat(sess.pcmParts);
    sess.pcmParts = [];
    const wav = buildWav(pcm);
    fs.writeFileSync(fullPath, wav);

    let sha256 = crypto.createHash('sha256').update(wav).digest('hex');
    let byteSize = wav.length;
    if (evidenceIngestGate && typeof evidenceIngestGate.inspectFile === 'function') {
        try {
            const inspected = await evidenceIngestGate.inspectFile({
                fullPath,
                originalFileName: fileName,
                rootDir: root,
                source: 'ptt_audio',
            });
            if (inspected && inspected.sha256) sha256 = inspected.sha256;
            if (inspected && inspected.byteSize != null) byteSize = inspected.byteSize;
        } catch (_) { /* keep local hash */ }
    }
    if (evidenceCrypto && typeof evidenceCrypto.encryptFileInPlace === 'function') {
        try { await evidenceCrypto.encryptFileInPlace(fullPath); } catch (_) { /* ignore */ }
    }

    let evidenceId = null;
    if (evidenceRegistry && typeof evidenceRegistry.registerFromUpload === 'function') {
        evidenceId = await evidenceRegistry.registerFromUpload({
            fullPath,
            rootDir: root,
            source: 'ptt_audio',
            storageTier: 'local',
            sha256,
            byteSize,
            deviceId,
            operatorName: sess.meta.operatorName || null,
            originalFileName: fileName,
            peer: sess.meta.peer || null,
        });
    }

    if (log && log.ptt) {
        log.ptt.info('ptt evidence saved', {
            path: 'ptt-call-audio-record-v1',
            evidenceId,
            deviceId,
            direction,
            groupSize: camIds.length || 1,
            bytes: byteSize,
            startedAt: sess.startedAt,
        });
    }
    return evidenceId;
}

function beginHqTalk(socketId, camIds, operatorName) {
    const key = sessionKey('hq', socketId || 'hq');
    begin(key, {
        direction: 'hq',
        camIds: (camIds || []).map(String),
        deviceId: camIds && camIds[0] ? String(camIds[0]) : 'hq-group',
        operatorName: operatorName || null,
    });
    return key;
}

function appendHqTalk(socketId, alawBuf) {
    appendAlaw(sessionKey('hq', socketId || 'hq'), alawBuf);
}

function endHqTalk(socketId) {
    end(sessionKey('hq', socketId || 'hq'));
}

function beginFieldTalk(camId) {
    const id = String(camId || '').trim();
    if (!id) return;
    begin(sessionKey('field', id), {
        direction: 'field',
        camIds: [id],
        deviceId: id,
    });
}

function appendFieldTalk(camId, alawBuf) {
    const id = String(camId || '').trim();
    if (!id) return;
    appendAlaw(sessionKey('field', id), alawBuf);
}

function endFieldTalk(camId) {
    const id = String(camId || '').trim();
    if (!id) return;
    end(sessionKey('field', id));
}

module.exports = {
    init,
    beginHqTalk,
    appendHqTalk,
    endHqTalk,
    beginFieldTalk,
    appendFieldTalk,
    endFieldTalk,
};
