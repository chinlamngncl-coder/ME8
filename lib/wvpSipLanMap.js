/**
 * mob-wvp-sip-lan-source-ip-v1 — shared LAN map for WVP SIP proxy + patcher.
 * mob-proxy-symmetric-nat-invite-v1 — INVITE uses REGISTER peer (NAT pinhole), not Contact.
 * Docker Desktop SNAT stamps REGISTER peer as 172.x; real BWC LAN lives here.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MAP_PATH = path.join(ROOT, 'storage', 'wvp-sip-lan-map.json');
const CONTACT_CACHE_PATH = path.join(ROOT, 'storage', 'last-sip-contact.json');

function isLanIpv4(ip) {
    const s = String(ip || '').trim().replace(/^::ffff:/i, '');
    if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(s)) return false;
    if (/^127\./.test(s) || s === '0.0.0.0') return false;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(s)) return false;
    return true;
}

function isBwcGbId(id) {
    const s = String(id || '').trim();
    return /^\d{18,20}$/.test(s);
}

function lanFromContactUri(uri) {
    const m = String(uri || '').match(/@([0-9.]+)(?::(\d+))?/);
    if (!m || !isLanIpv4(m[1])) return null;
    return {
        ip: m[1],
        port: m[2] ? parseInt(m[2], 10) : null,
    };
}

function readJsonSafe(filePath, fallback) {
    try {
        if (!fs.existsSync(filePath)) return fallback;
        const raw = fs.readFileSync(filePath, 'utf8');
        if (!raw) return fallback;
        const j = JSON.parse(raw);
        return j && typeof j === 'object' ? j : fallback;
    } catch (_) {
        return fallback;
    }
}

function writeMap(mapObj) {
    const dir = path.dirname(MAP_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const payload = Object.assign({ updatedAt: new Date().toISOString() }, mapObj || {});
    fs.writeFileSync(MAP_PATH, JSON.stringify(payload, null, 0), 'utf8');
}

function readMap() {
    const j = readJsonSafe(MAP_PATH, {});
    const devices = (j && j.devices && typeof j.devices === 'object') ? j.devices : {};
    return { updatedAt: j.updatedAt || null, devices };
}

/** REGISTER UDP peer = NAT pinhole — used for outbound INVITE. */
function rememberRegisterPeer(deviceId, ip, port) {
    const did = String(deviceId || '').trim();
    if (!isBwcGbId(did) || !isLanIpv4(ip)) return false;
    const p = port != null && Number.isFinite(Number(port)) ? Number(port) : null;
    if (p == null) return false;
    const map = readMap();
    const prev = map.devices[did] || {};
    map.devices[did] = Object.assign({}, prev, {
        peerIp: String(ip).trim(),
        peerPort: p,
        ip: String(ip).trim(),
        port: p,
        source: 'sip_proxy_peer',
        at: new Date().toISOString(),
    });
    writeMap(map);
    return true;
}

/** Contact is informational — must NOT overwrite peer for INVITE. */
function rememberContactOnly(deviceId, ip, port) {
    const did = String(deviceId || '').trim();
    if (!isBwcGbId(did) || !isLanIpv4(ip)) return false;
    const map = readMap();
    const prev = map.devices[did] || {};
    const p = port != null && Number.isFinite(Number(port)) ? Number(port) : null;
    map.devices[did] = Object.assign({}, prev, {
        contactIp: String(ip).trim(),
        contactPort: p,
        at: new Date().toISOString(),
    });
    writeMap(map);
    return true;
}

/**
 * Legacy entry — peer vs contact by source.
 * fleet_contact / contact sources never wipe REGISTER peer.
 */
function rememberLan(deviceId, ip, port, source) {
    const src = String(source || 'unknown');
    if (src === 'sip_proxy_peer') {
        return rememberRegisterPeer(deviceId, ip, port);
    }
    return rememberContactOnly(deviceId, ip, port);
}

/** Fleet SIP contact cache (Contact URI — not for INVITE). */
function lanFromFleetContactCache(deviceId) {
    const did = String(deviceId || '').trim();
    const cache = readJsonSafe(CONTACT_CACHE_PATH, {});
    if (did && cache[did]) {
        return lanFromContactUri(cache[did]);
    }
    return null;
}

function allFleetContactLans() {
    const cache = readJsonSafe(CONTACT_CACHE_PATH, {});
    const out = {};
    Object.keys(cache || {}).forEach((id) => {
        if (!isBwcGbId(id)) return;
        const lan = lanFromContactUri(cache[id]);
        if (lan) out[id] = lan;
    });
    return out;
}

/**
 * Real LAN for WVP DB / logs — contact preferred, then peer, then fleet Contact.
 * Not used for Soft Open INVITE destination.
 */
function resolveLanForDevice(deviceId) {
    const did = String(deviceId || '').trim();
    const map = readMap();
    const hit = map.devices[did];
    if (hit && isLanIpv4(hit.contactIp)) {
        return {
            ip: hit.contactIp,
            port: hit.contactPort != null ? hit.contactPort : null,
            source: 'sip_proxy_contact',
        };
    }
    if (hit && isLanIpv4(hit.peerIp) && hit.peerPort != null) {
        return {
            ip: hit.peerIp,
            port: hit.peerPort,
            source: hit.source || 'sip_proxy_peer',
        };
    }
    if (hit && isLanIpv4(hit.ip)) {
        return {
            ip: hit.ip,
            port: hit.port != null ? hit.port : null,
            source: hit.source || 'map',
        };
    }
    const fleet = lanFromFleetContactCache(did);
    if (fleet) {
        return { ip: fleet.ip, port: fleet.port, source: 'fleet_contact_cache' };
    }
    return null;
}

/**
 * mob-proxy-symmetric-nat-invite-v1 — INVITE target = REGISTER peer only.
 * Never fleet Contact / Contact header port (symmetric NAT failure).
 */
function resolveInvitePeer(deviceId) {
    const did = String(deviceId || '').trim();
    const map = readMap();
    const hit = map.devices[did];
    if (hit && isLanIpv4(hit.peerIp) && hit.peerPort != null && Number.isFinite(Number(hit.peerPort))) {
        return {
            ip: hit.peerIp,
            port: Number(hit.peerPort),
            source: 'sip_proxy_peer',
        };
    }
    if (hit && hit.source === 'sip_proxy_peer' && isLanIpv4(hit.ip)
        && hit.port != null && Number.isFinite(Number(hit.port))) {
        return {
            ip: hit.ip,
            port: Number(hit.port),
            source: 'sip_proxy_peer',
        };
    }
    return null;
}

function proxySignalAddress() {
    const ip = String(
        process.env.WVP_HOST_IP
        || process.env.FM_WVP_STREAM_HOST
        || process.env.WVP_HOST
        || process.env.HOST
        || '192.168.1.38'
    ).trim();
    const port = parseInt(process.env.WVP_SIP_PROXY_LISTEN || process.env.FM_WVP_SIP_PORT || '5060', 10) || 5060;
    return { ip, port };
}

function isProxySignalHost(ip, port) {
    const sig = proxySignalAddress();
    const a = String(ip || '').trim();
    const p = port != null ? Number(port) : null;
    return a === sig.ip && (p == null || p === sig.port);
}

module.exports = {
    MAP_PATH,
    CONTACT_CACHE_PATH,
    isLanIpv4,
    isBwcGbId,
    lanFromContactUri,
    rememberLan,
    rememberRegisterPeer,
    rememberContactOnly,
    readMap,
    resolveLanForDevice,
    resolveInvitePeer,
    allFleetContactLans,
    lanFromFleetContactCache,
    proxySignalAddress,
    isProxySignalHost,
};
