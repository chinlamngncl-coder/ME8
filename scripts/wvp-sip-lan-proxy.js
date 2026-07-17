/**
 * mob-wvp-sip-lan-source-ip-v1 + mob-wvp-invite-rtp-answer-v1
 * + mob-fleet-sip-port-5062-v1 — host GB video SIP is :5060 (Fleet YDT on :5062)
 * Host SIP proxy: cams → :5060 (real LAN source) → WVP container :15061
 * Play INVITE: WVP → host:5060 (device hostAddress) → real BWC LAN (demux by deviceId)
 *
 * Usage: node scripts/wvp-sip-lan-proxy.js
 * Env: WVP_SIP_PROXY_LISTEN=5060  WVP_SIP_PROXY_TARGET=127.0.0.1:15061
 */
'use strict';

const dgram = require('dgram');
const net = require('net');
const path = require('path');

const ROOT = path.join(__dirname, '..');
process.chdir(ROOT);

const lanMap = require('../lib/wvpSipLanMap');
const wvp = require('../lib/wvpLabClient');

const LISTEN_PORT = parseInt(process.env.WVP_SIP_PROXY_LISTEN || '5060', 10) || 5060;
const TARGET = String(process.env.WVP_SIP_PROXY_TARGET || '127.0.0.1:15061').trim();
const tm = TARGET.match(/^([^:]+):(\d+)$/);
const TARGET_HOST = tm ? tm[1] : '127.0.0.1';
const TARGET_PORT = tm ? parseInt(tm[2], 10) : 15061;
const SYNC_MS = Math.max(5000, parseInt(process.env.WVP_SIP_LAN_SYNC_MS || '10000', 10) || 10000);

/** call-id → { address, port, at } for UDP replies from WVP */
const udpRoutes = new Map();
/** deviceId → last REGISTER peer (NAT pinhole) — mob-proxy-symmetric-nat-invite-v1 */
const registerPeers = new Map();
const ROUTE_TTL_MS = 10 * 60 * 1000;
const PEER_TTL_MS = 30 * 60 * 1000;

const OUTBOUND_METHODS = {
    INVITE: true,
    ACK: true,
    BYE: true,
    CANCEL: true,
    MESSAGE: true,
    INFO: true,
    NOTIFY: true,
    SUBSCRIBE: true,
    OPTIONS: true,
};

function log(...args) {
    const line = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    console.log(new Date().toISOString() + ' [wvp-sip-lan-proxy] ' + line);
}

function parseSipBasics(buf) {
    const text = buf.toString('utf8');
    const first = (text.split(/\r?\n/)[0] || '').trim();
    const isReq = /^(REGISTER|INVITE|OPTIONS|MESSAGE|BYE|ACK|SUBSCRIBE|NOTIFY|INFO|CANCEL)\s/i.test(first);
    const statusM = !isReq ? first.match(/^SIP\/2\.0\s+(\d{3})\b/i) : null;
    const callIdM = text.match(/^Call-ID:\s*(.+)$/im) || text.match(/^i:\s*(.+)$/im);
    const fromM = text.match(/^From:\s*.*?sip:([^@>;\s]+)@/im)
        || text.match(/^f:\s*.*?sip:([^@>;\s]+)@/im);
    const toM = text.match(/^To:\s*.*?sip:([^@>;\s]+)@/im)
        || text.match(/^t:\s*.*?sip:([^@>;\s]+)@/im);
    const reqUriM = first.match(/^(?:INVITE|ACK|BYE|CANCEL|MESSAGE|INFO|NOTIFY|SUBSCRIBE|OPTIONS)\s+sip:([^@>;\s]+)@/i);
    const contactM = text.match(/^Contact:\s*.*?(sip:[^\s>;]+)/im)
        || text.match(/^m:\s*.*?(sip:[^\s>;]+)/im);
    const cseqM = text.match(/^CSeq:\s*\d+\s+(\w+)/im);
    const viaM = text.match(/^Via:\s*(.+)$/im) || text.match(/^v:\s*(.+)$/im);
    return {
        text,
        isReq,
        method: isReq ? (first.split(/\s+/)[0] || '').toUpperCase() : null,
        statusCode: statusM ? parseInt(statusM[1], 10) : null,
        callId: callIdM ? String(callIdM[1]).trim() : null,
        fromUser: fromM ? String(fromM[1]).trim() : null,
        toUser: toM ? String(toM[1]).trim() : null,
        reqUser: reqUriM ? String(reqUriM[1]).trim() : null,
        contactUri: contactM ? String(contactM[1]).trim() : null,
        cseqMethod: cseqM ? String(cseqM[1]).toUpperCase() : null,
        via: viaM ? String(viaM[1]).trim().slice(0, 180) : null,
    };
}

function rememberFromPacket(parsed, peerIp, peerPort) {
    const did = parsed.fromUser;
    if (!lanMap.isBwcGbId(did)) return;
    /* Peer first — NAT pinhole for INVITE (do not let Contact overwrite). */
    if (lanMap.isLanIpv4(peerIp) && peerPort != null) {
        registerPeers.set(did, {
            address: peerIp,
            port: Number(peerPort),
            at: Date.now(),
        });
        lanMap.rememberRegisterPeer(did, peerIp, peerPort);
    }
    const fromContact = lanMap.lanFromContactUri(parsed.contactUri);
    if (fromContact && lanMap.isLanIpv4(fromContact.ip)) {
        lanMap.rememberContactOnly(did, fromContact.ip, fromContact.port || peerPort);
    }
}

function pruneRoutes() {
    const now = Date.now();
    for (const [k, v] of udpRoutes.entries()) {
        if (!v || (now - (v.at || 0)) > ROUTE_TTL_MS) udpRoutes.delete(k);
    }
    for (const [k, v] of registerPeers.entries()) {
        if (!v || (now - (v.at || 0)) > PEER_TTL_MS) registerPeers.delete(k);
    }
}

/**
 * Soft Open INVITE destination = last REGISTER peer (symmetric NAT pinhole).
 * Never Contact header / fleet Contact port.
 */
function resolveCamTarget(deviceId) {
    const did = String(deviceId || '').trim();
    const mem = registerPeers.get(did);
    if (mem && lanMap.isLanIpv4(mem.address) && mem.port) {
        return {
            address: mem.address,
            port: Number(mem.port),
            source: 'register_peer_memory',
        };
    }
    const peer = lanMap.resolveInvitePeer(did);
    if (peer && lanMap.isLanIpv4(peer.ip) && peer.port) {
        return {
            address: peer.ip,
            port: Number(peer.port),
            source: peer.source || 'sip_proxy_peer',
        };
    }
    return null;
}

function isDockerOrLoopback(ip) {
    const s = String(ip || '').replace(/^::ffff:/i, '');
    if (s === '127.0.0.1' || s === '0.0.0.0') return true;
    return /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(s);
}

/** Docker hairpin: container → host LAN IP often arrives as source=host LAN, not 172.x */
function isWvpOutboundPeer(ip) {
    const s = String(ip || '').replace(/^::ffff:/i, '');
    if (isDockerOrLoopback(s)) return true;
    try {
        const sig = lanMap.proxySignalAddress();
        if (sig && s === String(sig.ip || '').trim()) return true;
    } catch (_) { /* ignore */ }
    return false;
}

function deviceIdForOutbound(parsed) {
    const candidates = [parsed.reqUser, parsed.toUser, parsed.fromUser];
    for (let i = 0; i < candidates.length; i += 1) {
        if (lanMap.isBwcGbId(candidates[i])) return candidates[i];
    }
    return null;
}

/**
 * Cam replies to Via. WVP inside Docker may advertise container :5060 / Docker IP.
 * Force Via/Contact host to proxy signal (host :5060) so replies hit this proxy.
 */
function rewriteSipForCamReply(msg, signalIp, signalPort) {
    let text = msg.toString('utf8');
    const hostPort = signalIp + ':' + signalPort;
    text = text.replace(
        /^(Via:\s*SIP\/2\.0\/(?:UDP|TCP)\s+)([^;\r\n]+)/gim,
        (full, prefix, hostpart) => {
            if (/^192\.168\.|^10\.|^172\./.test(String(hostpart).trim()) || /:\d+$/.test(hostpart)) {
                return prefix + hostPort;
            }
            return full;
        }
    );
    text = text.replace(
        /^(Contact:\s*<sip:[^@>]+@)([^:;>]+)(?::(\d+))?/gim,
        (full, prefix, host, port) => {
            if (lanMap.isLanIpv4(host) || isDockerOrLoopback(host) || host === signalIp) {
                return prefix + signalIp + ':' + signalPort;
            }
            return full;
        }
    );
    /* Content-Length unchanged (header-only edits; body untouched). */
    return Buffer.from(text, 'utf8');
}

function startUdp() {
    const sock = dgram.createSocket('udp4');
    sock.on('error', (err) => log('udp error', err.message));
    sock.on('message', (msg, rinfo) => {
        const parsed = parseSipBasics(msg);
        const peerIp = String(rinfo.address || '').replace(/^::ffff:/i, '');
        const fromTarget = peerIp === TARGET_HOST && rinfo.port === TARGET_PORT;

        if (fromTarget) {
            /* Reply / request from WVP container → original cam (call-id) or demux */
            let route = parsed.callId ? udpRoutes.get(parsed.callId) : null;
            if (!route) {
                const did = deviceIdForOutbound(parsed);
                const cam = did ? resolveCamTarget(did) : null;
                if (cam) {
                    route = { address: cam.address, port: cam.port, at: Date.now() };
                    if (parsed.callId) udpRoutes.set(parsed.callId, route);
                }
            }
            if (!route) {
                pruneRoutes();
                log('udp reply drop (no route)', { callId: parsed.callId, method: parsed.method });
                return;
            }
            sock.send(msg, route.port, route.address, (err) => {
                if (err) log('udp reply err', err.message);
            });
            return;
        }

        if (parsed.isReq && parsed.method === 'REGISTER') {
            if (parsed.callId) {
                udpRoutes.set(parsed.callId, {
                    address: peerIp,
                    port: rinfo.port,
                    at: Date.now(),
                });
            }
            rememberFromPacket(parsed, peerIp, rinfo.port);
            log('REGISTER', {
                deviceId: parsed.fromUser,
                peer: peerIp + ':' + rinfo.port,
                contact: parsed.contactUri || null,
                inviteTarget: peerIp + ':' + rinfo.port,
            });
            scheduleSyncSoon();
            sock.send(msg, TARGET_PORT, TARGET_HOST, (err) => {
                if (err) log('udp forward err', err.message);
            });
            return;
        }

        /* mob-wvp-invite-rtp-answer-v1 — WVP dials host:5061; relay INVITE to real BWC */
        if (
            parsed.isReq
            && parsed.method
            && OUTBOUND_METHODS[parsed.method]
            && isWvpOutboundPeer(peerIp)
        ) {
            const did = deviceIdForOutbound(parsed);
            const cam = did ? resolveCamTarget(did) : null;
            if (!cam) {
                log('invite relay drop (no register peer)', {
                    method: parsed.method,
                    deviceId: did,
                    peer: peerIp + ':' + rinfo.port,
                    hint: 'wait for BWC REGISTER then Soft Open again',
                });
                return;
            }
            if (parsed.callId) {
                udpRoutes.set(parsed.callId, {
                    address: cam.address,
                    port: cam.port,
                    at: Date.now(),
                });
            }
            const sig = lanMap.proxySignalAddress();
            const outBuf = rewriteSipForCamReply(msg, sig.ip, sig.port || LISTEN_PORT);
            log('invite relay → cam', {
                method: parsed.method,
                deviceId: did,
                from: peerIp + ':' + rinfo.port,
                to: cam.address + ':' + cam.port,
                viaRewrite: sig.ip + ':' + (sig.port || LISTEN_PORT),
                targetSource: cam.source || null,
            });
            sock.send(outBuf, cam.port, cam.address, (err) => {
                if (err) log('invite relay err', err.message);
                else if (parsed.method === 'INVITE') {
                    log('INVITE forwarded to BWC', {
                        deviceId: did,
                        to: cam.address + ':' + cam.port,
                        targetSource: cam.source || null,
                        note: 'register_peer_nat_pinhole',
                    });
                }
            });
            return;
        }

        /* Real cam (or other LAN) → WVP */
        if (parsed.callId) {
            udpRoutes.set(parsed.callId, {
                address: peerIp,
                port: rinfo.port,
                at: Date.now(),
            });
        }
        /* mob-proxy-invite-reply-trace-v1 — prove 200 OK returns to WVP :15061 */
        if (!parsed.isReq && parsed.statusCode === 200) {
            const did = deviceIdForOutbound(parsed) || parsed.toUser || parsed.fromUser;
            log('200 OK from cam → WVP', {
                deviceId: did || null,
                from: peerIp + ':' + rinfo.port,
                to: TARGET_HOST + ':' + TARGET_PORT,
                callId: parsed.callId || null,
                cseqMethod: parsed.cseqMethod || null,
                via: parsed.via || null,
            });
        } else if (!parsed.isReq && parsed.statusCode != null
            && (parsed.cseqMethod === 'INVITE' || parsed.statusCode >= 400)) {
            log('SIP reply from cam → WVP', {
                status: parsed.statusCode,
                deviceId: deviceIdForOutbound(parsed) || parsed.toUser || null,
                from: peerIp + ':' + rinfo.port,
                to: TARGET_HOST + ':' + TARGET_PORT,
                callId: parsed.callId || null,
                cseqMethod: parsed.cseqMethod || null,
            });
        }
        sock.send(msg, TARGET_PORT, TARGET_HOST, (err) => {
            if (err) log('udp forward err', err.message);
            else if (!parsed.isReq && parsed.statusCode === 200) {
                log('200 OK forwarded to WVP', {
                    to: TARGET_HOST + ':' + TARGET_PORT,
                    callId: parsed.callId || null,
                });
            }
        });
    });
    sock.bind(LISTEN_PORT, '0.0.0.0', () => {
        log('UDP listen', LISTEN_PORT, '→', TARGET_HOST + ':' + TARGET_PORT);
    });
    return sock;
}

function startTcp() {
    const server = net.createServer((client) => {
        const peerIp = String(client.remoteAddress || '').replace(/^::ffff:/i, '');
        const peerPort = client.remotePort;
        const upstream = net.connect(TARGET_PORT, TARGET_HOST);
        let buf = Buffer.alloc(0);

        function onClientData(chunk) {
            buf = Buffer.concat([buf, chunk]);
            if (buf.length > 16 && buf.length < 65536) {
                const parsed = parseSipBasics(buf);
                if (parsed.isReq && parsed.method === 'REGISTER') {
                    rememberFromPacket(parsed, peerIp, peerPort);
                    log('REGISTER/tcp', {
                        deviceId: parsed.fromUser,
                        peer: peerIp + ':' + peerPort,
                    });
                    scheduleSyncSoon();
                }
            }
            if (!upstream.destroyed) upstream.write(chunk);
        }

        client.on('data', onClientData);
        upstream.on('data', (chunk) => {
            if (!client.destroyed) client.write(chunk);
        });
        const closeBoth = () => {
            try { client.destroy(); } catch (_) { /* ignore */ }
            try { upstream.destroy(); } catch (_) { /* ignore */ }
        };
        client.on('error', closeBoth);
        upstream.on('error', closeBoth);
        client.on('close', closeBoth);
        upstream.on('close', closeBoth);
    });
    server.on('error', (err) => log('tcp error', err.message));
    server.listen(LISTEN_PORT, '0.0.0.0', () => {
        log('TCP listen', LISTEN_PORT, '→', TARGET_HOST + ':' + TARGET_PORT);
    });
    return server;
}

let syncTimer = null;
let syncSoon = null;

function scheduleSyncSoon() {
    if (syncSoon) return;
    syncSoon = setTimeout(() => {
        syncSoon = null;
        runSync().catch((e) => log('sync err', e.message));
    }, 1500);
}

async function runSync() {
    if (!wvp.isEnabled()) {
        process.env.FM_LAB_WVP = '1';
    }
    const report = await wvp.syncLanSourceIps({ reason: 'proxy_loop' });
    if (report && (report.patched || []).length) {
        log('patched', report.patched);
    }
}

function startSyncLoop() {
    const tick = () => {
        runSync().catch((e) => log('sync err', e.message));
    };
    tick();
    syncTimer = setInterval(tick, SYNC_MS);
}

log('start', {
    listen: LISTEN_PORT,
    target: TARGET_HOST + ':' + TARGET_PORT,
    syncMs: SYNC_MS,
    inviteRelay: true,
    inviteTarget: 'register_peer_nat_pinhole',
});
startUdp();
startTcp();
startSyncLoop();

process.on('SIGINT', () => {
    if (syncTimer) clearInterval(syncTimer);
    process.exit(0);
});
