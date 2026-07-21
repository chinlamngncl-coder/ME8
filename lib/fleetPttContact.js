/**
 * MOB-APPLY-FLEET-PTT-CONTACT-WVP-HOMED-V1
 * Resolve SIP contact for PTT group MESSAGE — WVP register peer when handoff on.
 */
'use strict';

const wvpSipLanMap = require('./wvpSipLanMap');

function contactUriFromPeer(camId, ip, port) {
    const id = String(camId || '').trim();
    const p = port != null && Number.isFinite(Number(port)) ? Number(port) : 5060;
    if (!id || !wvpSipLanMap.isLanIpv4(ip)) return null;
    return `sip:${id}@${ip}:${p};transport=udp`;
}

function isHandoffOn() {
    try {
        const wvpVideoHandoff = require('./wvpVideoHandoff');
        return wvpVideoHandoff.isHandoffEnabled();
    } catch (_) {
        return false;
    }
}

/**
 * @returns {{ uri: string, source: string, peer?: object } | null}
 */
function resolveContactUri(camId, fleetCache) {
    const id = String(camId || '').trim();
    if (!id) return null;

    const peer = wvpSipLanMap.resolveInvitePeer(id);
    if (isHandoffOn() && peer && peer.ip && peer.port) {
        const uri = contactUriFromPeer(id, peer.ip, peer.port);
        if (uri) {
            return { uri: uri, source: 'wvp_register_peer', peer: peer };
        }
    }

    const cache = fleetCache || {};
    if (cache[id]) {
        return { uri: cache[id], source: 'fleet_sip_cache' };
    }

    const lan = wvpSipLanMap.resolveLanForDevice(id);
    if (lan && lan.ip) {
        const uri = contactUriFromPeer(id, lan.ip, lan.port || 5060);
        if (uri) {
            return { uri: uri, source: lan.source || 'wvp_lan_map' };
        }
    }

    return null;
}

module.exports = {
    contactUriFromPeer,
    resolveContactUri,
    isHandoffOn,
};
