/**
 * PTT cluster intercom (PDF §11, pages 24–26). TCP + HDA_NET_CMD header (same flags as messaging).
 */

const fs = require('fs');
const path = require('path');
const net = require('net');
const hdaMsg = require('./hdaMessageProtocol');
const { alawToPcm16 } = require('./psG711Audio');
const pttAudioCmdPolicy = require('./pttAudioCmdPolicy');

const CMD_PTT_LOGIN = 1;
const CMD_PTT_LOGIN_RET = 2;
/** PDF page 27: dwCMD 130 for PTT audio (PCMA 8kHz mono). Page 26 legacy uses 4 on some builds. */
const CMD_PTT_AUDIO = 130;
const CMD_PTT_AUDIO_LEGACY = 4;
const RX_IDLE_MS = 450;
const FRAME_BYTES = 160;

/** camId → learned downlink dwCMD (persisted across restarts when learnedCmdsPath set). */
const learnedDownlinkCmdByCamId = new Map();

let policyDepsProvider = null;
let learnedCmdsPath = null;
let learnedCmdsDirty = false;
let learnedCmdsFlushTimer = null;

/** camId (SIP) → { socket, peer, loggedIn, txIndex } */
const deviceSessions = new Map();
/** camId → { active, timer } */
const rxSessions = new Map();

let resolveCamIdFn = null;

/** True after PTT TCP server listen callback fires. */
let pttServerActive = false;

function isPttServerActive() {
    return pttServerActive;
}

function setResolveCamId(fn) {
    resolveCamIdFn = typeof fn === 'function' ? fn : null;
}

function buildPttLoginRet(loginRet = 0, dwIndex = 0) {
    const lpData = Buffer.alloc(4);
    lpData.writeUInt32LE(loginRet, 0);
    return hdaMsg.buildHeader(CMD_PTT_LOGIN_RET, dwIndex, lpData);
}

function buildPttAudioFrame(alawPayload, dwIndex = 0, dwCMD = CMD_PTT_AUDIO) {
    return hdaMsg.buildHeader(dwCMD, dwIndex, alawPayload);
}

function policyDeps() {
    return typeof policyDepsProvider === 'function' ? policyDepsProvider() : {};
}

function learnedCmdForCam(camId) {
    const learned = learnedDownlinkCmdByCamId.get(normalizeCamId(camId));
    if (learned === CMD_PTT_AUDIO || learned === CMD_PTT_AUDIO_LEGACY) return learned;
    return null;
}

function loadLearnedCmds(filePath) {
    if (!filePath) return;
    try {
        if (!fs.existsSync(filePath)) return;
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (!data || typeof data !== 'object') return;
        Object.keys(data).forEach((camId) => {
            const id = normalizeCamId(camId);
            const cmd = parseInt(data[camId], 10);
            if (id && (cmd === CMD_PTT_AUDIO || cmd === CMD_PTT_AUDIO_LEGACY)) {
                learnedDownlinkCmdByCamId.set(id, cmd);
            }
        });
    } catch (_) { /* ignore */ }
}

function flushLearnedCmdsSoon() {
    if (!learnedCmdsPath) return;
    learnedCmdsDirty = true;
    if (learnedCmdsFlushTimer) return;
    learnedCmdsFlushTimer = setTimeout(() => {
        learnedCmdsFlushTimer = null;
        if (!learnedCmdsDirty || !learnedCmdsPath) return;
        learnedCmdsDirty = false;
        try {
            const out = {};
            learnedDownlinkCmdByCamId.forEach((cmd, camId) => {
                out[camId] = cmd;
            });
            fs.mkdirSync(path.dirname(learnedCmdsPath), { recursive: true });
            fs.writeFileSync(learnedCmdsPath, JSON.stringify(out, null, 2), 'utf8');
        } catch (_) { /* ignore */ }
    }, 400);
}

function seedDownlinkAudioCmd(camId, loginUser, log) {
    const id = normalizeCamId(camId);
    if (!id) return null;
    const cmd = pttAudioCmdPolicy.resolveDwCmd({
        camId: id,
        loginUser,
        learnedCmd: learnedCmdForCam(id),
    }, policyDeps());
    if (log) {
        log.ptt.info('downlink cmd seed', {
            camId: id,
            cmd,
            legacy: cmd === CMD_PTT_AUDIO_LEGACY,
        });
    }
    return cmd;
}

function resolveDownlinkAudioCmd(sess) {
    if (!sess) return CMD_PTT_AUDIO;
    const id = normalizeCamId(sess.camId);
    return pttAudioCmdPolicy.resolveDwCmd({
        camId: id,
        loginUser: sess.loginUser,
        learnedCmd: learnedCmdForCam(id),
    }, policyDeps());
}

function noteUplinkAudioCmd(camId, dwCMD, log) {
    if (!isPttAudioCmd(dwCMD)) return;
    const id = normalizeCamId(camId);
    const sess = deviceSessions.get(id);
    if (!sess) return;
    const prev = learnedDownlinkCmdByCamId.get(id);
    learnedDownlinkCmdByCamId.set(id, dwCMD);
    if (prev !== dwCMD) flushLearnedCmdsSoon();
    if (sess.downlinkAudioCmd === dwCMD) return;
    sess.downlinkAudioCmd = dwCMD;
    if (log) {
        log.ptt.info('downlink cmd matched uplink', {
            camId: id,
            cmd: dwCMD,
            legacy: dwCMD === CMD_PTT_AUDIO_LEGACY,
        });
    }
}

/** G.711 A-law silence — pad short downlink frames to 20 ms (160 B). */
function normalizeAlawFrame(chunk) {
    if (!chunk || !chunk.length) return Buffer.alloc(FRAME_BYTES, 0xD5);
    if (chunk.length === FRAME_BYTES) return chunk;
    if (chunk.length > FRAME_BYTES) return chunk.subarray(0, FRAME_BYTES);
    const out = Buffer.alloc(FRAME_BYTES, 0xD5);
    chunk.copy(out, 0);
    return out;
}

function parsePttLoginXml(lpData) {
    const text = (lpData || Buffer.alloc(0)).toString('utf8').replace(/\0/g, '').trim();
    const user = (text.match(/user\s*=\s*['"]?([^'">\s]+)/i) || [])[1];
    const pwd = (text.match(/pwd\s*=\s*['"]?([^'">\s]+)/i) || [])[1];
    const type = (text.match(/type\s*=\s*['"]?([^'">\s]+)/i) || [])[1];
    return { user, pwd, type, raw: text };
}

function escAttr(v) {
    return String(v == null ? '' : v)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}

/** PDF 24–26 (channel 1) + 31–33 (ReqGroupTalkList, sumnum/snid/channeltype). */
function buildPttGroupXml(opts) {
    const {
        gtid,
        host,
        port,
        status = '1',
        channeltype = '0',
        channelid = '0',
        devices = [],
        snid = '66',
    } = opts;

    const num = devices.length;
    let deviceRows = '';
    devices.forEach((d, i) => {
        const id = d.id != null ? d.id : String(i + 1);
        const policeNumber = escAttr(d.policeNumber || d.pnumber || '00001');
        const svcid = escAttr(d.svcid != null ? d.svcid : '1');
        const sn = escAttr(d.sn || d.id || '');
        const name = escAttr(d.name || d.policeNumber || policeNumber);
        const ch = escAttr(d.channeltype != null ? d.channeltype : channeltype);
        deviceRows += `<device id="${escAttr(id)}" policeNumber="${policeNumber}" svcid="${svcid}" sn="${sn}" name="${name}" channeltype="${ch}"/>\n`;
    });

    return `<?xml version="1.0" encoding="utf-8"?>\n<groups>\n<groupInfo gtid="${escAttr(gtid)}" ip="${escAttr(host)}" port="${escAttr(port)}" status="${escAttr(status)}" channeltype="${escAttr(channeltype)}" channelid="${escAttr(channelid)}"/>\n<devices num="${num}">\n${deviceRows}</devices>\n<sumnum>${num}</sumnum>\n<snid>${escAttr(snid)}</snid>\n</groups>`;
}

function isPttAudioCmd(dwCMD) {
    return dwCMD === CMD_PTT_AUDIO || dwCMD === CMD_PTT_AUDIO_LEGACY;
}

function normalizeCamId(raw) {
    return String(raw || '').trim();
}

function peerIpFromPeer(peer) {
    if (!peer) return '';
    const idx = peer.lastIndexOf(':');
    if (idx <= 0) return peer;
    const host = peer.slice(0, idx);
    if (host.startsWith('::ffff:')) return host.slice(7);
    return host;
}

function resolveCamId(peer, pttUser) {
    const ip = peerIpFromPeer(peer);
    if (resolveCamIdFn) {
        const resolved = resolveCamIdFn(ip, pttUser);
        if (resolved) return normalizeCamId(resolved);
    }
    return normalizeCamId(pttUser);
}

function registerDeviceSession(camId, socket, peer, loginUser, log) {
    const id = normalizeCamId(camId);
    if (!id) return;
    const prev = deviceSessions.get(id);
    if (prev && prev.socket !== socket && !prev.socket.destroyed) {
        try { prev.socket.destroy(); } catch (_) { /* ignore */ }
    }
    const user = loginUser ? String(loginUser).trim() : null;
    deviceSessions.set(id, {
        socket,
        peer,
        loggedIn: true,
        camId: id,
        loginUser: user,
        txIndex: 0,
        lastRxDwIndex: null,
        downlinkAudioCmd: seedDownlinkAudioCmd(id, user, log),
    });
    socket._pttCamId = id;
    try { socket.setNoDelay(true); } catch (_) { /* ignore */ }
}

function unregisterDeviceSession(socket) {
    const camId = socket._pttCamId;
    if (!camId) return null;
    const cur = deviceSessions.get(camId);
    if (cur && cur.socket === socket) deviceSessions.delete(camId);
    delete socket._pttCamId;
    return camId;
}

function isDevicePttOnline(camId) {
    const id = normalizeCamId(camId);
    const sess = deviceSessions.get(id);
    return !!(sess && sess.loggedIn && sess.socket && !sess.socket.destroyed);
}

function sendPttAudioToDevice(camId, alawPayload, opts) {
    const id = normalizeCamId(camId);
    const sess = deviceSessions.get(id);
    if (!sess || !sess.loggedIn || !sess.socket || sess.socket.destroyed) return false;
    if (!alawPayload || !alawPayload.length) return false;
    const maxWritableBytes = Number(opts && opts.maxWritableBytes);
    const downlinkCmd = resolveDownlinkAudioCmd(sess);
    try {
        let off = 0;
        while (off < alawPayload.length) {
            const chunk = normalizeAlawFrame(alawPayload.subarray(off, off + FRAME_BYTES));
            const frame = buildPttAudioFrame(chunk, sess.txIndex, downlinkCmd);
            if (Number.isFinite(maxWritableBytes) && maxWritableBytes > 0
                && Number(sess.socket.writableLength || 0) + frame.length > maxWritableBytes) {
                return false;
            }
            sess.txIndex += 1;
            sess.socket.write(frame);
            off += FRAME_BYTES;
        }
        return true;
    } catch (_) {
        return false;
    }
}

function getDeviceSessionProof(camId) {
    const id = normalizeCamId(camId);
    const sess = deviceSessions.get(id);
    if (!sess) return null;
    return {
        camId: id,
        peer: sess.peer || null,
        loggedIn: !!sess.loggedIn,
        destroyed: !!(sess.socket && sess.socket.destroyed),
        txIndex: Number.isFinite(sess.txIndex) ? sess.txIndex : null,
        downlinkAudioCmd: resolveDownlinkAudioCmd(sess),
        loginUser: sess.loginUser ? String(sess.loginUser) : null,
    };
}

function listOnlineDeviceIds() {
    return [...deviceSessions.keys()].filter((id) => isDevicePttOnline(id));
}

function getDeviceLoginUser(camId) {
    const id = normalizeCamId(camId);
    const sess = deviceSessions.get(id);
    return sess && sess.loginUser ? String(sess.loginUser) : null;
}

function listDeviceLoginUsers() {
    const out = {};
    deviceSessions.forEach((sess, camId) => {
        if (sess && sess.loginUser) out[camId] = String(sess.loginUser);
    });
    return out;
}

function clearRxSession(camId, onPttRxState) {
    const id = normalizeCamId(camId);
    if (!id) return;
    const sess = rxSessions.get(id);
    const wasActive = !!(sess && sess.active);
    if (sess && sess.timer) clearTimeout(sess.timer);
    rxSessions.delete(id);
    if (wasActive && typeof onPttRxState === 'function') onPttRxState(id, false);
}

function handleInboundPttAudio(camId, alawPayload, callbacks) {
    const id = normalizeCamId(camId);
    const { onPttRxState, onPttRxAudio, onPttRxAlaw, log } = callbacks;
    if (!id || !alawPayload || !alawPayload.length) return;

    let sess = rxSessions.get(id);
    if (!sess) {
        sess = { active: false, timer: null };
        rxSessions.set(id, sess);
    }
    if (!sess.active) {
        sess.active = true;
        if (typeof onPttRxState === 'function') onPttRxState(id, true);
        if (log) log.ptt.info('rx from field started', { camId: id });
    }
    if (sess.timer) clearTimeout(sess.timer);
    sess.timer = setTimeout(() => {
        const cur = rxSessions.get(id);
        if (!cur) return;
        cur.active = false;
        cur.timer = null;
        rxSessions.delete(id);
        if (typeof onPttRxState === 'function') onPttRxState(id, false);
        if (log) log.ptt.info('rx from field ended', { camId: id });
    }, RX_IDLE_MS);

    if (typeof onPttRxAudio === 'function' || typeof onPttRxAlaw === 'function') {
        let off = 0;
        while (off < alawPayload.length) {
            const chunk = alawPayload.subarray(off, off + FRAME_BYTES);
            if (chunk.length) {
                if (typeof onPttRxAlaw === 'function') {
                    try {
                        onPttRxAlaw(id, normalizeAlawFrame(chunk));
                    } catch (err) {
                        if (log) log.ptt.warn('field relay callback failed', {
                            camId: id,
                            message: err && err.message,
                        });
                    }
                }
                if (typeof onPttRxAudio === 'function') {
                    onPttRxAudio(id, alawToPcm16(chunk));
                }
            }
            off += FRAME_BYTES;
        }
    }
}

function startPttServer(opts) {
    const {
        host,
        port,
        gtid,
        log,
        onDeviceState,
        onPttRxState,
        onPttRxAudio,
        onPttRxAlaw,
        resolveCamId: resolveCamIdInjector,
        policyDeps: policyDepsInjector,
        learnedCmdsPath: learnedPath,
    } = opts || {};
    if (resolveCamIdInjector) setResolveCamId(resolveCamIdInjector);
    policyDepsProvider = typeof policyDepsInjector === 'function' ? policyDepsInjector : null;
    learnedCmdsPath = learnedPath || null;
    loadLearnedCmds(learnedCmdsPath);
    let tcpServer = null;

    const rxCallbacks = { onPttRxState, onPttRxAudio, onPttRxAlaw, log };

    function emitDeviceState(camId, online) {
        if (typeof onDeviceState === 'function') onDeviceState(camId, online);
    }

    function handleSocket(socket) {
        const peer = `${socket.remoteAddress}:${socket.remotePort}`;
        let buffer = Buffer.alloc(0);
        let loggedIn = false;

        log.ptt.info('client connected', { peer });

        socket.on('data', (chunk) => {
            try {
            buffer = Buffer.concat([buffer, chunk]);

            while (true) {
                const idx = hdaMsg.findMsgFlagIndex(buffer);
                if (idx < 0) {
                    if (buffer.length > 256 * 1024) buffer = buffer.subarray(buffer.length - 64);
                    break;
                }
                if (idx > 0) buffer = buffer.subarray(idx);
                const header = hdaMsg.readHeader(buffer);
                if (!header) break;

                const frameLen = hdaMsg.HEADER_SIZE + header.nLength;
                if (buffer.length < frameLen) break;

                const payload = header.nLength > 0
                    ? buffer.subarray(hdaMsg.HEADER_SIZE, frameLen)
                    : Buffer.alloc(0);
                buffer = buffer.subarray(frameLen);

                if (header.dwCMD === CMD_PTT_LOGIN) {
                    const login = parsePttLoginXml(payload);
                    socket.write(buildPttLoginRet(0, header.dwIndex));
                    loggedIn = true;
                    const camId = resolveCamId(peer, login.user);
                    if (camId) {
                        registerDeviceSession(camId, socket, peer, login.user, log);
                        log.ptt.info('login ok', {
                            peer,
                            user: login.user,
                            camId,
                            type: login.type,
                            gtid,
                        });
                        emitDeviceState(camId, true);
                    } else {
                        log.ptt.info('login ok (no user id)', { peer, gtid });
                    }
                    continue;
                }

                if (isPttAudioCmd(header.dwCMD) && loggedIn) {
                    const camId = socket._pttCamId;
                    if (camId && payload.length) {
                        const uplinkSess = deviceSessions.get(camId);
                        if (uplinkSess) {
                            uplinkSess.lastRxDwIndex = header.dwIndex;
                            if (uplinkSess.txIndex === 0 && header.dwIndex > 0) {
                                uplinkSess.txIndex = header.dwIndex;
                            }
                        }
                        noteUplinkAudioCmd(camId, header.dwCMD, log);
                        handleInboundPttAudio(camId, payload, rxCallbacks);
                    }
                    continue;
                }

                if (header.dwCMD !== 0) {
                    log.ptt.info('frame', { peer, cmd: header.dwCMD, len: header.nLength });
                }
            }
            } catch (err) {
                log.ptt.err('frame handler error', { peer, message: err.message });
            }
        });

        socket.on('close', () => {
            try {
            const camId = unregisterDeviceSession(socket);
            log.ptt.info('client disconnected', { peer, camId: camId || null });
            if (camId) {
                clearRxSession(camId, onPttRxState);
                emitDeviceState(camId, false);
            }
            } catch (err) {
                log.ptt.err('close handler error', { peer, message: err.message });
            }
        });
        socket.on('error', (err) => log.ptt.err('socket error', { peer, message: err.message }));
    }

    pttServerActive = false;
    tcpServer = net.createServer(handleSocket);
    tcpServer.listen(port, '0.0.0.0', () => {
        pttServerActive = true;
        log.ptt.info('listening', { host, port, gtid });
    });
    tcpServer.on('error', (err) => {
        pttServerActive = false;
        log.ptt.err('listener error', err.message);
    });

    return tcpServer;
}

function pushPttGroupToDevice(sip, opts) {
    const {
        cameraContactUri,
        camId,
        realm,
        serverId,
        host,
        gtid,
        port,
        status,
        devices,
        log,
    } = opts;

    if (!cameraContactUri || !camId) return;

    const content = buildPttGroupXml({
        gtid,
        host,
        port,
        status,
        devices,
        snid: opts.snid || '66',
        channeltype: opts.channeltype,
        channelid: opts.channelid,
    });
    sip.send({
        method: 'MESSAGE',
        uri: cameraContactUri,
        headers: {
            to: { uri: `sip:${camId}@${realm}` },
            from: { uri: `sip:${serverId}@${realm}`, params: { tag: Math.floor(Math.random() * 10000).toString() } },
            'call-id': Math.random().toString(36).substring(7),
            cseq: { method: 'MESSAGE', seq: 4 },
            'content-type': 'Application/MANSCDP+xml',
            'content-length': content.length,
        },
        content,
    }, () => {
        log.ptt.info('group config sent', { camId, gtid, host, port, status });
    });
}

module.exports = {
    CMD_PTT_LOGIN,
    CMD_PTT_AUDIO,
    CMD_PTT_AUDIO_LEGACY,
    isPttAudioCmd,
    buildPttGroupXml,
    buildPttAudioFrame,
    handleInboundPttAudio,
    normalizeAlawFrame,
    startPttServer,
    isPttServerActive,
    pushPttGroupToDevice,
    isDevicePttOnline,
    sendPttAudioToDevice,
    getDeviceSessionProof,
    listOnlineDeviceIds,
    getDeviceLoginUser,
    listDeviceLoginUsers,
    setResolveCamId,
};
