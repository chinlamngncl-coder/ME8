/**
 * MOB-APPLY-FLEET-PTT-CONTACT-WVP-HOMED-V1
 * Deliver PTT group config SIP MESSAGE to WVP-homed cams via :5060 register peer (UDP).
 * Cam trusts platform on :5060 — Fleet :5062 direct MESSAGE is often ignored.
 */
'use strict';

const dgram = require('dgram');
const crypto = require('crypto');
const wvpSipLanMap = require('./wvpSipLanMap');
const pttServer = require('./pttServer');
const fleetPttContact = require('./fleetPttContact');

function shouldRelayForCam(camId) {
    const id = String(camId || '').trim();
    if (!id || !fleetPttContact.isHandoffOn()) return false;
    const peer = wvpSipLanMap.resolveInvitePeer(id);
    return !!(peer && peer.ip && peer.port);
}

function buildSipMessagePacket(opts) {
    const {
        camId,
        peerIp,
        peerPort,
        signalIp,
        signalPort,
        realm,
        serverId,
        content,
    } = opts;
    const branch = 'z9hG4bK' + crypto.randomBytes(6).toString('hex');
    const callId = crypto.randomBytes(8).toString('hex') + '@' + signalIp;
    const tag = String(Math.floor(Math.random() * 100000));
    const body = content || '';
    const contentLen = Buffer.byteLength(body, 'utf8');
    const lines = [
        'MESSAGE sip:' + camId + '@' + peerIp + ':' + peerPort + ' SIP/2.0',
        'Via: SIP/2.0/UDP ' + signalIp + ':' + signalPort + ';branch=' + branch + ';rport',
        'From: <sip:' + serverId + '@' + realm + '>;tag=' + tag,
        'To: <sip:' + camId + '@' + realm + '>',
        'Call-ID: ' + callId,
        'CSeq: 1 MESSAGE',
        'Max-Forwards: 70',
        'Content-Type: Application/MANSCDP+xml',
        'Content-Length: ' + contentLen,
        '',
        body,
    ];
    return Buffer.from(lines.join('\r\n'), 'utf8');
}

/**
 * @param {object} opts — same shape as pttServer.pushPttGroupToDevice minus cameraContactUri/sip
 * @returns {Promise<{ ok: boolean, reason?: string, peer?: string }>}
 */
function pushPttGroup(opts) {
    opts = opts || {};
    const camId = String(opts.camId || '').trim();
    if (!camId) return Promise.resolve({ ok: false, reason: 'camId_required' });

    const peer = wvpSipLanMap.resolveInvitePeer(camId);
    if (!peer || !peer.ip || !peer.port) {
        return Promise.resolve({ ok: false, reason: 'no_wvp_register_peer' });
    }

    const sig = wvpSipLanMap.proxySignalAddress();
    const content = pttServer.buildPttGroupXml({
        gtid: opts.gtid,
        host: opts.host,
        port: opts.port,
        status: opts.status,
        devices: opts.devices,
        snid: opts.snid || '66',
        channeltype: opts.channeltype,
        channelid: opts.channelid,
    });

    const packet = buildSipMessagePacket({
        camId: camId,
        peerIp: peer.ip,
        peerPort: peer.port,
        signalIp: sig.ip,
        signalPort: sig.port,
        realm: opts.realm,
        serverId: opts.serverId,
        content: content,
    });

    return new Promise(function (resolve) {
        const sock = dgram.createSocket('udp4');
        sock.on('error', function (err) {
            try { sock.close(); } catch (_) { /* ignore */ }
            resolve({ ok: false, reason: err && err.message ? err.message : String(err) });
        });
        sock.send(packet, peer.port, peer.ip, function (err) {
            try { sock.close(); } catch (_) { /* ignore */ }
            if (err) {
                resolve({ ok: false, reason: err.message || String(err) });
                return;
            }
            resolve({
                ok: true,
                peer: peer.ip + ':' + peer.port,
                via: sig.ip + ':' + sig.port,
            });
        });
    });
}

module.exports = {
    shouldRelayForCam,
    pushPttGroup,
};
