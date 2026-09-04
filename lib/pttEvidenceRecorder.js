/**
 * PTT-CALL-AUDIO-RECORD-V1 — stream SOS / Manual Record PTT talk to Evidence WAV.
 * Gate stays at the caller (anyCamInPttEvidence). Fail-open: never throw into live PTT.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { alawToPcm16 } = require('./psG711Audio');

const MIN_PCM_BYTES = 8000; /* ~0.5s @ 8kHz 16-bit mono */
const MAX_PCM_BYTES = 8 * 8000 * 2 * 60; /* ~8 min hard cap per burst */
const IDLE_FLUSH_MS = 1200;
const WAV_HEADER_BYTES = 44;
/* SOS-AUDIO-RECORD-GATE-AND-CALL-V1 — full-duplex Call sessions (HQ side only; officer voice is
   already in the HQ MP4 track). Roll to a new segment every 5 min instead of the PTT hard cap;
   zero-fill gaps > 1000 ms (tab throttle / mute / drop) so the file stays wall-clock true;
   jitter below that is written as received. */
const CALL_ROLL_BYTES = 8000 * 2 * 300; /* 5 min @ 8kHz 16-bit mono */
const CALL_GAP_FILL_MS = 1000;
const CALL_FRAME_MS = 20;
const CALL_FRAME_BYTES = 8000 * 2 * CALL_FRAME_MS / 1000; /* 320 */
const PART_EXT = '.part';
/* base key ('call:<camId>' | 'gcall:<groupId>') → live indexed session key ('call:<camId>:seg2') */
const activeCallSegKey = new Map();
const callSegCounter = new Map();

let storageDir = null;
let log = null;
let evidenceRegistry = null;
let evidenceIngestGate = null;
let evidenceCrypto = null;
let sosIncidents = null;
let enabled = true;

/** @type {Map<string, object>} */
const sessions = new Map();
/* JSON-STORE-SINGLE-WRITER-V1 — per-key finalize chain: bursts on one key register in
   talk order, one at a time (registry lookups/binds for the same cam never interleave). */
const finalizeChains = new Map();
let fileSeq = 0;

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
    sosIncidents = opts && opts.sosIncidents ? opts.sosIncidents : null;
    enabled = opts && opts.enabled === false ? false : true;
    setImmediate(function () { sweepOrphanParts().catch(function () { /* fail-open */ }); });
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

function buildWavHeader(dataSize) {
    const header = Buffer.alloc(WAV_HEADER_BYTES);
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
    return header;
}

function writeWavHeaderAtStart(fullPath, dataSize) {
    const header = buildWavHeader(dataSize);
    return new Promise(function (resolve, reject) {
        fs.open(fullPath, 'r+', function (err, fd) {
            if (err) return reject(err);
            fs.write(fd, header, 0, header.length, 0, function (wErr) {
                fs.close(fd, function () {
                    if (wErr) reject(wErr);
                    else resolve();
                });
            });
        });
    });
}

function sha256File(fullPath) {
    return new Promise(function (resolve, reject) {
        const hash = crypto.createHash('sha256');
        const rs = fs.createReadStream(fullPath);
        rs.on('error', reject);
        hash.on('error', reject);
        rs.on('data', function (chunk) { hash.update(chunk); });
        rs.on('end', function () { resolve(hash.digest('hex')); });
    });
}

function installRelative(root, fullPath) {
    try {
        return path.relative(root, fullPath).split(path.sep).join('/');
    } catch (_) {
        return null;
    }
}

function findOpenSosForCams(camIds) {
    if (!sosIncidents || typeof sosIncidents.findOpenIncidentIdForResponseCam !== 'function') {
        return null;
    }
    const ids = Array.isArray(camIds) ? camIds : [];
    for (let i = 0; i < ids.length; i += 1) {
        const camId = String(ids[i] || '').trim();
        if (!camId) continue;
        try {
            const incidentId = sosIncidents.findOpenIncidentIdForResponseCam(camId);
            if (incidentId) return { incidentId, cameraId: camId };
        } catch (_) { /* fail-open */ }
    }
    return null;
}

function begin(key, meta) {
    if (!isEnabled() || !key) return;
    try {
        const existing = sessions.get(key);
        if (existing) {
            existing.meta = Object.assign({}, existing.meta, meta || {});
            return;
        }
        const root = rootDir();
        if (!root) return;
        const startedAt = new Date().toISOString();
        const merged = Object.assign({ direction: 'hq' }, meta || {});
        const camIds = Array.isArray(merged.camIds) ? merged.camIds.filter(Boolean) : [];
        const deviceId = String(merged.deviceId || camIds[0] || 'ptt').trim() || 'ptt';
        const direction = merged.direction === 'field' ? 'field' : 'hq';
        const isCall = merged.kind === 'call';
        const day = startedAt.slice(0, 10);
        const stamp = startedAt.replace(/[:.]/g, '-');
        const safeDev = deviceId.replace(/[^\w.-]+/g, '_').slice(0, 48);
        /* JSON-STORE-SINGLE-WRITER-V1 — per-process sequence so end()+begin() in the same ms
           can never open (flags 'w') the file that is still being finalized. */
        fileSeq = (fileSeq + 1) % 100000;
        let fileName;
        /* PTT-TALK-BIND-AFTER-ACK-V1 — capture the open SOS at begin for calls AND PTT talks, so a
           talk that ends after Ack still binds (finalize falls back to sess.meta.incidentId). */
        const openSosAtBegin = findOpenSosForCams(camIds);
        merged.incidentId = openSosAtBegin ? openSosAtBegin.incidentId : (merged.incidentId || null);
        if (isCall) {
            /* CALL-hq-<cam>-<incidentId|none>-<startedAtMs>-<pid>-<seq>.wav — the name carries the
               bind so the boot sweep can attach an orphan .part after a crash. */
            const safeInc = String(merged.incidentId || 'none').replace(/[^\w.-]+/g, '_').slice(0, 48);
            fileName = 'CALL-hq~' + safeDev + '~' + safeInc + '~' + Date.parse(startedAt) + '~' + process.pid
                + '~' + String(fileSeq).padStart(5, '0') + '.wav';
        } else {
            fileName = 'PTT-' + direction + '-' + safeDev + '-' + stamp + '-' + String(fileSeq).padStart(5, '0') + '.wav';
        }
        const relDir = path.join('ptt-audio', day, safeDev);
        const absDir = path.join(root, relDir);
        fs.mkdirSync(absDir, { recursive: true });
        const fullPath = path.join(absDir, fileName);
        const writePath = isCall ? fullPath + PART_EXT : fullPath;
        /* Call: 1 MB buffer so a gap-fill or short disk stall never trips the drop path; PTT unchanged. */
        const stream = fs.createWriteStream(writePath, isCall ? { flags: 'w', highWaterMark: 1 << 20 } : { flags: 'w' });
        stream.on('error', function (err) {
            if (log && log.ptt) log.ptt.warn('ptt evidence stream failed', { message: err && err.message });
        });
        stream.write(Buffer.alloc(WAV_HEADER_BYTES));
        sessions.set(key, {
            key,
            stream,
            dropping: false,
            pcmBytes: 0,
            startedAt,
            fullPath,
            writePath,
            fileName,
            root,
            meta: merged,
            flushTimer: null,
            finalizing: false,
            isCall,
            rollBytes: isCall ? CALL_ROLL_BYTES : 0,
            lastWriteAt: 0,
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
        if (!sess || sess.finalizing || !sess.stream) return;
        if (sess.isCall) return appendCallPcm(sess, alawBuf);
        if (sess.dropping) return;
        if (sess.pcmBytes >= MAX_PCM_BYTES) return;
        const pcm = alawToPcm16(Buffer.isBuffer(alawBuf) ? alawBuf : Buffer.from(alawBuf));
        if (!pcm || !pcm.length) return;
        const room = MAX_PCM_BYTES - sess.pcmBytes;
        const slice = pcm.length > room ? pcm.subarray(0, room) : pcm;
        const ok = sess.stream.write(Buffer.from(slice));
        sess.pcmBytes += slice.length;
        if (!ok) {
            sess.dropping = true;
            sess.stream.once('drain', function () { sess.dropping = false; });
        }
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

/* Call branch of appendAlaw: wall-clock-true file. Gap > 1000 ms since the last accepted chunk
   → zero-fill (whole 20 ms frames, minus this chunk's own length). Backpressure drops are covered
   by the same rule. Segment roll = end(this indexed key) + begin(next indexed key): two distinct
   sessions, two distinct finalize chains, no shared state. */
function appendCallPcm(sess, alawBuf) {
    const pcm = alawToPcm16(Buffer.isBuffer(alawBuf) ? alawBuf : Buffer.from(alawBuf));
    if (!pcm || !pcm.length) return;
    const now = Date.now();
    if (sess.lastWriteAt && !sess.dropping) {
        const gapMs = now - sess.lastWriteAt;
        if (gapMs > CALL_GAP_FILL_MS) {
            const chunkMs = pcm.length / (8000 * 2) * 1000;
            let fillBytes = Math.floor((gapMs - chunkMs) / CALL_FRAME_MS) * CALL_FRAME_BYTES;
            fillBytes = Math.min(Math.max(fillBytes, 0), sess.rollBytes - sess.pcmBytes);
            if (fillBytes > 0) {
                sess.stream.write(Buffer.alloc(fillBytes));
                sess.pcmBytes += fillBytes;
            }
        }
    }
    sess.lastWriteAt = now;
    if (sess.dropping) return;
    if (sess.pcmBytes + pcm.length > sess.rollBytes) {
        const rolled = rollCallSegment(sess);
        if (!rolled) return;
        rolled.lastWriteAt = now;
        return appendCallPcm(rolled, alawBuf);
    }
    const ok = sess.stream.write(Buffer.from(pcm));
    sess.pcmBytes += pcm.length;
    if (!ok) {
        sess.dropping = true;
        sess.stream.once('drain', function () { sess.dropping = false; });
    }
}

function nextCallSegKey(baseKey) {
    const n = (callSegCounter.get(baseKey) || 0) + 1;
    callSegCounter.set(baseKey, n);
    const segKey = baseKey + ':seg' + n;
    activeCallSegKey.set(baseKey, segKey);
    return segKey;
}

function rollCallSegment(sess) {
    const baseKey = sess.meta && sess.meta.baseKey;
    if (!baseKey) { end(sess.key); return null; }
    const meta = Object.assign({}, sess.meta, { segIndex: (sess.meta.segIndex || 1) + 1 });
    end(sess.key);
    const segKey = nextCallSegKey(baseKey);
    begin(segKey, meta);
    return sessions.get(segKey) || null;
}

function beginCall(baseKey, meta) {
    if (!isEnabled() || !baseKey) return;
    if (activeCallSegKey.has(baseKey)) return;
    const segKey = nextCallSegKey(baseKey);
    begin(segKey, Object.assign({ direction: 'hq', kind: 'call', baseKey, segIndex: 1 }, meta || {}));
    if (!sessions.has(segKey)) activeCallSegKey.delete(baseKey);
}

function appendCall(baseKey, alawBuf) {
    const segKey = activeCallSegKey.get(baseKey);
    if (!segKey || !sessions.has(segKey)) return;
    appendAlaw(segKey, alawBuf);
}

function endCall(baseKey) {
    const segKey = activeCallSegKey.get(baseKey);
    activeCallSegKey.delete(baseKey);
    callSegCounter.delete(baseKey);
    if (segKey) end(segKey);
}

/* Boot sweep — a crash leaves CALL-*.wav.part with a zero header. The name carries cam +
   incident + startedAt, so the file is promoted and bound without any in-memory state. */
const PART_NAME_RE = /^CALL-hq~([\w.-]+)~([\w.-]+)~(\d{13})~(\d+)~(\d{5})\.wav$/;
async function sweepOrphanParts() {
    if (!isEnabled()) return;
    const root = rootDir();
    const base = root ? path.join(root, 'ptt-audio') : null;
    if (!base || !fs.existsSync(base)) return;
    const found = [];
    (function walk(dir, depth) {
        if (depth > 3) return;
        let entries = [];
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
        entries.forEach(function (ent) {
            const p = path.join(dir, ent.name);
            if (ent.isDirectory()) walk(p, depth + 1);
            else if (ent.isFile() && ent.name.endsWith('.wav' + PART_EXT)) found.push(p);
        });
    }(base, 0));
    for (let i = 0; i < found.length; i += 1) {
        const partPath = found[i];
        try {
            const wavName = path.basename(partPath, PART_EXT);
            const m = PART_NAME_RE.exec(wavName);
            const size = fs.statSync(partPath).size;
            const pcmBytes = Math.max(0, size - WAV_HEADER_BYTES);
            if (!m || pcmBytes < MIN_PCM_BYTES) {
                try { fs.unlinkSync(partPath); } catch (_) { /* ignore */ }
                continue;
            }
            const camId = m[1];
            const incidentId = m[2] === 'none' ? null : m[2];
            const startedAt = new Date(Number(m[3])).toISOString();
            const sess = {
                key: 'sweep:' + wavName,
                stream: null,
                pcmBytes,
                startedAt,
                fullPath: path.join(path.dirname(partPath), wavName),
                writePath: partPath,
                fileName: wavName,
                root,
                meta: { direction: 'hq', kind: 'call', camIds: [camId], deviceId: camId, incidentId, recovered: true },
                isCall: true,
            };
            await finalizeSession(sess);
        } catch (err) {
            if (log && log.ptt) log.ptt.warn('ptt evidence sweep failed', { message: err && err.message });
        }
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
    const stream = sess.stream;
    sess.stream = null;
    function runFinalize() {
        setImmediate(function () {
            const prev = finalizeChains.get(key) || Promise.resolve();
            const next = prev.then(function () { return finalizeSession(sess); }).catch(function (err) {
                if (log && log.ptt) log.ptt.warn('ptt evidence finalize failed', { message: err && err.message });
            }).then(function () {
                if (finalizeChains.get(key) === next) finalizeChains.delete(key);
            });
            finalizeChains.set(key, next);
        });
    }
    if (!stream) {
        runFinalize();
        return;
    }
    try {
        stream.end(runFinalize);
    } catch (_) {
        runFinalize();
    }
}

async function finalizeSession(sess) {
    try {
        if (!isEnabled() || !sess) return null;
        const fullPath = sess.fullPath;
        const fileName = sess.fileName;
        const root = sess.root || rootDir();
        if (!fullPath || !fileName || !root) return null;
        const writePath = sess.writePath || fullPath;
        if (sess.pcmBytes < MIN_PCM_BYTES) {
            try { fs.unlinkSync(writePath); } catch (_) { /* ignore short burst */ }
            return null;
        }
        await writeWavHeaderAtStart(writePath, sess.pcmBytes);
        if (writePath !== fullPath) fs.renameSync(writePath, fullPath); /* .part → .wav: now visible */

        let sha256 = await sha256File(fullPath);
        let byteSize = WAV_HEADER_BYTES + sess.pcmBytes;
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

        const camIds = Array.isArray(sess.meta.camIds) ? sess.meta.camIds.filter(Boolean) : [];
        const deviceId = String(sess.meta.deviceId || camIds[0] || 'ptt').trim() || 'ptt';
        const direction = sess.meta.direction === 'field' ? 'field' : 'hq';

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

        /* Call: bind to the incident captured at begin (name-embedded) — survives Ack during a
           long call and the boot sweep. PTT: unchanged live lookup. */
        let openSos = findOpenSosForCams(camIds);
        if (!openSos && sess.meta.incidentId) {
            openSos = { incidentId: sess.meta.incidentId, cameraId: camIds[0] || deviceId };
        }
        if (openSos && evidenceId && sosIncidents && typeof sosIncidents.attachPttAudio === 'function') {
            try {
                sosIncidents.attachPttAudio({
                    incidentId: openSos.incidentId,
                    cameraId: openSos.cameraId,
                    evidenceId,
                    fileName,
                    relativePath: installRelative(root, fullPath),
                    direction,
                    startedAt: sess.startedAt || null,
                    kind: sess.isCall ? 'call' : 'ptt',
                });
            } catch (_) { /* never break catalog save */ }
        }

        if (log && log.ptt) {
            log.ptt.info('ptt evidence saved', {
                path: sess.isCall ? 'sos-audio-record-gate-and-call-v1' : 'ptt-call-audio-record-v1',
                evidenceId,
                deviceId,
                direction,
                kind: sess.isCall ? 'call' : 'ptt',
                segIndex: sess.meta.segIndex || null,
                recovered: !!sess.meta.recovered,
                groupSize: camIds.length || 1,
                bytes: byteSize,
                startedAt: sess.startedAt,
                incidentId: openSos && openSos.incidentId ? openSos.incidentId : null,
            });
        }
        return evidenceId;
    } catch (err) {
        if (log && log.ptt) log.ptt.warn('ptt evidence finalize failed', { message: err && err.message });
        return null;
    }
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

/* SOS-AUDIO-RECORD-GATE-AND-CALL-V1 — HQ side of full-duplex Calls.
   1:1  : beginHqCall(camId, op) / appendHqCall(camId, alaw) / endHqCall(camId)
   group: beginHqGroupCall(callId, camIds, op) / appendHqGroupCall(callId, alaw) / endHqGroupCall(callId) */
function beginHqCall(camId, operatorName) {
    const id = String(camId || '').trim();
    if (!id) return;
    beginCall('call:' + id, { camIds: [id], deviceId: id, operatorName: operatorName || null });
}
function appendHqCall(camId, alawBuf) {
    const id = String(camId || '').trim();
    if (id) appendCall('call:' + id, alawBuf);
}
function endHqCall(camId) {
    const id = String(camId || '').trim();
    if (id) endCall('call:' + id);
}
function beginHqGroupCall(callId, camIds, operatorName) {
    const id = String(callId || '').trim();
    if (!id) return;
    const ids = (camIds || []).map(String).filter(Boolean);
    beginCall('gcall:' + id, { camIds: ids, deviceId: ids[0] || 'hq-group', operatorName: operatorName || null });
}
function appendHqGroupCall(callId, alawBuf) {
    const id = String(callId || '').trim();
    if (id) appendCall('gcall:' + id, alawBuf);
}
function endHqGroupCall(callId) {
    const id = String(callId || '').trim();
    if (id) endCall('gcall:' + id);
}

module.exports = {
    init,
    beginHqTalk,
    appendHqTalk,
    endHqTalk,
    beginFieldTalk,
    appendFieldTalk,
    endFieldTalk,
    beginHqCall,
    appendHqCall,
    endHqCall,
    beginHqGroupCall,
    appendHqGroupCall,
    endHqGroupCall,
};
