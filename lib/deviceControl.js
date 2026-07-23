/**
 * SIP DeviceControl (PDF §10, pages 21–23). RecordCmd is passed through as-is.
 * DEVICE-CONTROL-SIP-ACK-TRACE-V1 — log Call-Id / ack / timeout.
 * DEVICE-CONTROL-SIP-NO-RETRANSMIT-STORM-V1 — default UDP once (no Timer-E storm).
 *
 * Why: sip.js non-INVITE client txn retransmits MESSAGE (500ms…32s → ~6 copies).
 * Some BWCs run TakePicture/Record on every copy. Lab 01:43: 1× sent + ack timeout + late 408.
 */

'use strict';

const dgram = require('dgram');
const sipLib = require('sip');

const {
    createSipCallId,
    createSipTag,
    createGbSequenceNumber,
} = require('./sipCryptoIdentifiers');

const KNOWN_RECORD_CMDS = [
    'Lock',
    'Unlock',
    'Record',
    'StopRecord',
    'TakePicture',
    'OutElectricFence',
    'ShutDown',
    'Reboot',
    'FormatSdcard',
    'RestoreFactory',
    'CleanData:1',
    'CleanData:3',
    'CleanData:4',
    'CleanData:5',
];

function buildControlXml(deviceId, recordCmd, sn) {
    const seq = sn != null ? sn : createGbSequenceNumber();
    return `<?xml version="1.0"?>\n<Control>\n<CmdType>DeviceControl</CmdType>\n<SN>${seq}</SN>\n<DeviceID>${deviceId}</DeviceID>\n<RecordCmd>${recordCmd}</RecordCmd>\n</Control>`;
}

function truncateContact(uri) {
    const s = String(uri || '');
    if (s.length <= 140) return s;
    return s.slice(0, 137) + '...';
}

function ackTimeoutMs(opts) {
    const raw = opts && opts.ackTimeoutMs != null
        ? opts.ackTimeoutMs
        : (process.env.FM_DEVICE_CONTROL_ACK_MS || '8000');
    const n = parseInt(String(raw), 10);
    return Math.max(2000, Number.isFinite(n) ? n : 8000);
}

/** Prefer single UDP datagram (no sip.js Timer E). Set FM_DEVICE_CONTROL_SIP_TXN=1 to restore old path. */
function useTxnRetransmit(opts) {
    if (opts && opts.useTxn === true) return true;
    if (opts && opts.useTxn === false) return false;
    const flag = String(process.env.FM_DEVICE_CONTROL_SIP_TXN || '').trim();
    return flag === '1' || /^true$/i.test(flag) || /^on$/i.test(flag);
}

function parseContactTarget(uri) {
    const s = String(uri || '').trim();
    const m = s.match(/^sip:[^@\s]+@([^:;>\s]+)(?::(\d+))?/i);
    if (!m) return null;
    const port = parseInt(m[2] || '5060', 10);
    return {
        host: m[1],
        port: Number.isFinite(port) && port > 0 ? port : 5060,
    };
}

function buildMessageRequest(opts, content, callId) {
    const {
        cameraContactUri, deviceId, realm, serverId, publicHost, sipPort,
    } = opts;
    const viaHost = String(publicHost || '').trim() || '0.0.0.0';
    const viaPort = parseInt(String(sipPort != null ? sipPort : 5060), 10) || 5060;
    const branch = typeof sipLib.generateBranch === 'function'
        ? sipLib.generateBranch()
        : ('z9hG4bK' + createSipCallId('dc').replace(/-/g, '').slice(0, 16));

    return {
        method: 'MESSAGE',
        uri: cameraContactUri,
        headers: {
            via: [{
                version: '2.0',
                protocol: 'UDP',
                host: viaHost,
                port: viaPort,
                params: { branch, rport: null },
            }],
            to: { uri: `sip:${deviceId}@${realm}` },
            from: { uri: `sip:${serverId}@${realm}`, params: { tag: createSipTag() } },
            'call-id': callId,
            cseq: { method: 'MESSAGE', seq: 1 },
            'max-forwards': 70,
            'content-type': 'Application/MANSCDP+xml',
            'content-length': Buffer.byteLength(content, 'utf8'),
        },
        content,
    };
}

function sendDeviceControlOnce(opts, content, callId, baseMeta, log) {
    const target = parseContactTarget(opts.cameraContactUri);
    if (!target) {
        if (log) {
            log.sip.warn('device control once skipped — bad contact', baseMeta);
        }
        return false;
    }

    let wire;
    try {
        const rq = buildMessageRequest(opts, content, callId);
        wire = Buffer.from(sipLib.stringify(rq), 'utf8');
    } catch (err) {
        if (log) {
            log.sip.warn('device control once stringify failed', Object.assign({}, baseMeta, {
                message: err && err.message ? String(err.message).slice(0, 120) : 'fail',
            }));
        }
        return false;
    }

    const sock = dgram.createSocket('udp4');
    sock.send(wire, target.port, target.host, (err) => {
        try { sock.close(); } catch (_) { /* ignore */ }
        if (err && log) {
            log.sip.warn('device control once send failed', Object.assign({}, baseMeta, {
                message: err && err.message ? String(err.message).slice(0, 120) : 'fail',
                targetHost: target.host,
                targetPort: target.port,
            }));
            return;
        }
        if (log) {
            log.sip.info('device control once ok', Object.assign({}, baseMeta, {
                targetHost: target.host,
                targetPort: target.port,
                bytes: wire.length,
            }));
        }
    });
    return true;
}

function sendDeviceControlTxn(sip, opts, content, callId, baseMeta, log) {
    const sentAt = Date.now();
    let settled = false;
    let responseN = 0;
    const waitMs = ackTimeoutMs(opts);

    const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        if (log) {
            log.sip.warn('device control ack timeout', Object.assign({}, baseMeta, {
                waitMs: Date.now() - sentAt,
                responseN,
                note: 'txn path — UDP retransmit risk on cam',
            }));
        }
    }, waitMs);
    if (typeof timer.unref === 'function') timer.unref();

    sip.send({
        method: 'MESSAGE',
        uri: opts.cameraContactUri,
        headers: {
            to: { uri: `sip:${opts.deviceId}@${opts.realm}` },
            from: { uri: `sip:${opts.serverId}@${opts.realm}`, params: { tag: createSipTag() } },
            'call-id': callId,
            cseq: { method: 'MESSAGE', seq: 1 },
            'content-type': 'Application/MANSCDP+xml',
            'content-length': Buffer.byteLength(content, 'utf8'),
        },
        content,
    }, (response) => {
        responseN += 1;
        const status = response && response.status;
        const elapsedMs = Date.now() - sentAt;
        if (status >= 100 && status < 200) {
            if (log) {
                log.sip.info('device control provisional', Object.assign({}, baseMeta, {
                    status,
                    responseN,
                    elapsedMs,
                }));
            }
            return;
        }
        if (settled) {
            if (log) {
                log.sip.info('device control ack late', Object.assign({}, baseMeta, {
                    status,
                    responseN,
                    elapsedMs,
                    ok: status === 200,
                }));
            }
            return;
        }
        settled = true;
        clearTimeout(timer);
        if (log) {
            log.sip.info('device control ack', Object.assign({}, baseMeta, {
                status,
                responseN,
                elapsedMs,
                ok: status === 200,
            }));
        }
    });
    return true;
}

function sendDeviceControl(sip, opts) {
    const { cameraContactUri, deviceId, realm, serverId, recordCmd, log } = opts || {};
    if (!cameraContactUri || !deviceId || !recordCmd) return false;

    const callId = createSipCallId();
    const sn = createGbSequenceNumber();
    const content = buildControlXml(deviceId, String(recordCmd), sn);
    const mode = useTxnRetransmit(opts) ? 'sip_txn' : 'udp_once';

    const baseMeta = {
        device: deviceId,
        recordCmd: String(recordCmd),
        callId,
        sn: String(sn),
        contact: truncateContact(cameraContactUri),
        contactSource: opts.contactSource || null,
        mode,
    };

    if (log) {
        log.sip.info('device control sent', baseMeta);
    }

    if (mode === 'udp_once') {
        return sendDeviceControlOnce(opts, content, callId, baseMeta, log);
    }
    if (!sip || typeof sip.send !== 'function') {
        if (log) log.sip.warn('device control txn skipped — no sip', baseMeta);
        return false;
    }
    return sendDeviceControlTxn(sip, opts, content, callId, baseMeta, log);
}

/** SIP voice broadcast notify — device initiates audio INVITE (no platform Play INVITE). */
function buildBroadcastXml(sourceId, targetId, sn) {
    const seq = sn != null ? sn : createGbSequenceNumber();
    return `<?xml version="1.0"?>\n<Notify>\n<CmdType>Broadcast</CmdType>\n<SN>${seq}</SN>\n<SourceID>${sourceId}</SourceID>\n<TargetID>${targetId}</TargetID>\n</Notify>`;
}

function sendVoiceBroadcastNotify(sip, opts) {
    const { cameraContactUri, deviceId, realm, serverId, log } = opts;
    if (!cameraContactUri || !deviceId || !serverId) return false;

    const content = buildBroadcastXml(serverId, deviceId);
    sip.send({
        method: 'MESSAGE',
        uri: cameraContactUri,
        headers: {
            to: { uri: `sip:${deviceId}@${realm}` },
            from: { uri: `sip:${serverId}@${realm}`, params: { tag: createSipTag() } },
            'call-id': createSipCallId(),
            cseq: { method: 'MESSAGE', seq: 1 },
            'content-type': 'Application/MANSCDP+xml',
            'content-length': Buffer.byteLength(content, 'utf8'),
        },
        content,
    }, () => {});

    if (log) {
        log.sip.info('voice broadcast sent', { device: deviceId });
    }
    return true;
}

module.exports = {
    KNOWN_RECORD_CMDS,
    buildControlXml,
    sendDeviceControl,
    buildBroadcastXml,
    sendVoiceBroadcastNotify,
    parseContactTarget,
};
