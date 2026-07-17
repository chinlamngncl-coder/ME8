/**
 * mob-wvp-fleet-register-mirror-v1 (PARKED for dual-protocol)
 *
 * mob-fleet-sip-port-5062-v1 — real BWC GB registers to WVP :5060.
 * Set FM_WVP_MIRROR_REGISTER=1 only for emergency lab dig; default OFF.
 */
'use strict';

const dgram = require('dgram');
const crypto = require('crypto');
const log = require('./fleetLog');
const wvpSipLanMap = require('./wvpSipLanMap');
const { patchWvpDbLanAndChannel } = require('./wvpDbLanPatch');

const pending = new Map(); /* deviceId → timer */
const lastOk = new Map(); /* deviceId → ts */
const refreshTimers = new Map();

function md5hex(s) {
    return crypto.createHash('md5').update(String(s), 'utf8').digest('hex');
}

function isEnabled() {
    if (String(process.env.FM_LAB_WVP || '').trim() !== '1') return false;
    const flag = String(process.env.FM_WVP_MIRROR_REGISTER || '1').trim();
    return flag !== '0' && flag.toLowerCase() !== 'false' && flag.toLowerCase() !== 'off';
}

function mirrorCfg() {
    return {
        host: String(process.env.FM_WVP_SIP_HOST || '127.0.0.1').trim() || '127.0.0.1',
        port: parseInt(process.env.FM_WVP_SIP_PORT || '5060', 10) || 5060,
        domain: String(process.env.FM_WVP_DOMAIN || process.env.WVP_DOMAIN || '4401020049').trim(),
        serverId: String(process.env.FM_WVP_SERVER_ID || process.env.WVP_ID || '44010200492000000001').trim(),
        password: String(process.env.FM_WVP_DEVICE_PASSWORD || process.env.WVP_PWD || 'admin123').trim(),
        expiresSec: Math.max(60, parseInt(process.env.FM_WVP_MIRROR_EXPIRES || '3600', 10) || 3600),
        refreshMs: Math.max(30000, parseInt(process.env.FM_WVP_MIRROR_REFRESH_MS || '120000', 10) || 120000),
        debounceMs: Math.max(500, parseInt(process.env.FM_WVP_MIRROR_DEBOUNCE_MS || '2500', 10) || 2500),
        minIntervalMs: Math.max(5000, parseInt(process.env.FM_WVP_MIRROR_MIN_INTERVAL_MS || '20000', 10) || 20000),
    };
}

function parseWwwAuthenticate(raw) {
    const s = String(raw || '');
    const realm = (s.match(/realm\s*=\s*"([^"]+)"/i) || [])[1];
    const nonce = (s.match(/nonce\s*=\s*"([^"]+)"/i) || [])[1];
    const opaque = (s.match(/opaque\s*=\s*"([^"]+)"/i) || [])[1];
    const algorithm = (s.match(/algorithm\s*=\s*([^\s,]+)/i) || [])[1] || 'MD5';
    if (!realm || !nonce) return null;
    return { realm, nonce, opaque: opaque || null, algorithm };
}

function digestsResponse(username, password, realm, nonce, method, uri) {
    const ha1 = md5hex(username + ':' + realm + ':' + password);
    const ha2 = md5hex(method + ':' + uri);
    return md5hex(ha1 + ':' + nonce + ':' + ha2);
}

function normalizeContactUri(contactUri, deviceId) {
    let uri = String(contactUri || '').trim();
    if (!uri) return null;
    if (uri.charAt(0) === '<') {
        const m = uri.match(/<(sip:[^>]+)>/i);
        if (m) uri = m[1];
    }
    if (!/^sip:/i.test(uri)) uri = 'sip:' + uri;
    const lan = wvpSipLanMap.lanFromContactUri(uri);
    if (!lan) return null;
    /* Ensure user part is device id when possible */
    if (wvpSipLanMap.isBwcGbId(deviceId) && !uri.toLowerCase().includes(String(deviceId).toLowerCase())) {
        uri = 'sip:' + deviceId + '@' + lan.ip + (lan.port ? (':' + lan.port) : '');
    }
    return { uri, ip: lan.ip, port: lan.port };
}

function buildRegisterText(opts) {
    const branch = 'z9hG4bK' + crypto.randomBytes(8).toString('hex');
    const fromTag = opts.fromTag || crypto.randomBytes(4).toString('hex');
    const callId = opts.callId || (crypto.randomBytes(8).toString('hex') + '@me8-mirror');
    const cseq = opts.cseq || 1;
    const reqUri = 'sip:' + opts.serverId + '@' + opts.host + ':' + opts.port;
    const aor = 'sip:' + opts.deviceId + '@' + opts.domain;
    const viaHost = opts.viaHost || '127.0.0.1';
    const viaPort = opts.viaPort || opts.localPort;
    let authLine = '';
    if (opts.auth) {
        const response = digestsResponse(
            opts.auth.username,
            opts.auth.password,
            opts.auth.realm,
            opts.auth.nonce,
            'REGISTER',
            reqUri
        );
        authLine = 'Authorization: Digest username="' + opts.auth.username
            + '", realm="' + opts.auth.realm
            + '", nonce="' + opts.auth.nonce
            + '", uri="' + reqUri
            + '", response="' + response
            + '", algorithm=MD5'
            + (opts.auth.opaque ? (', opaque="' + opts.auth.opaque + '"') : '')
            + '\r\n';
    }
    return (
        'REGISTER ' + reqUri + ' SIP/2.0\r\n'
        + 'Via: SIP/2.0/UDP ' + viaHost + ':' + viaPort + ';rport;branch=' + branch + '\r\n'
        + 'Max-Forwards: 70\r\n'
        + 'From: <' + aor + '>;tag=' + fromTag + '\r\n'
        + 'To: <' + aor + '>\r\n'
        + 'Call-ID: ' + callId + '\r\n'
        + 'CSeq: ' + cseq + ' REGISTER\r\n'
        + 'Contact: <' + opts.contactUri + '>\r\n'
        + 'Expires: ' + opts.expiresSec + '\r\n'
        + 'User-Agent: ME8-WVP-RegisterMirror/1\r\n'
        + authLine
        + 'Content-Length: 0\r\n'
        + '\r\n'
    );
}

/** Bind once, send REGISTER, wait one response. */
function udpRegisterRound(host, port, buildFn, timeoutMs) {
    return new Promise((resolve, reject) => {
        const sock = dgram.createSocket('udp4');
        let done = false;
        const timer = setTimeout(() => {
            if (done) return;
            done = true;
            try { sock.close(); } catch (_) { /* ignore */ }
            reject(new Error('wvp_mirror_register_timeout'));
        }, timeoutMs || 8000);
        sock.on('error', (err) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            try { sock.close(); } catch (_) { /* ignore */ }
            reject(err);
        });
        sock.on('message', (msg) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            const local = sock.address();
            try { sock.close(); } catch (_) { /* ignore */ }
            resolve({ text: msg.toString('utf8'), localPort: local && local.port });
        });
        sock.bind(0, '0.0.0.0', () => {
            const local = sock.address();
            const text = buildFn(local.port);
            sock.send(Buffer.from(text, 'utf8'), port, host, (err) => {
                if (err && !done) {
                    done = true;
                    clearTimeout(timer);
                    try { sock.close(); } catch (_) { /* ignore */ }
                    reject(err);
                }
            });
        });
    });
}

function parseStatus(text) {
    const m = String(text || '').match(/^SIP\/\d+\.\d+\s+(\d+)/m);
    return m ? parseInt(m[1], 10) : 0;
}

function extractHeader(text, name) {
    const re = new RegExp('^' + name + ':\\s*(.+)$', 'im');
    const m = String(text || '').match(re);
    return m ? String(m[1]).trim() : '';
}

async function registerDeviceOnce(deviceId, contactUri) {
    const did = String(deviceId || '').trim();
    if (!wvpSipLanMap.isBwcGbId(did)) {
        return { ok: false, deviceId: did, reason: 'not_bwc_gb_id' };
    }
    const contact = normalizeContactUri(contactUri, did);
    if (!contact) {
        return { ok: false, deviceId: did, reason: 'no_lan_contact' };
    }
    wvpSipLanMap.rememberLan(did, contact.ip, contact.port, 'fleet_register_mirror');

    const c = mirrorCfg();
    const callId = crypto.randomBytes(8).toString('hex') + '@me8-mirror';
    const fromTag = crypto.randomBytes(4).toString('hex');

    const first = await udpRegisterRound(c.host, c.port, (localPort) => buildRegisterText({
        deviceId: did,
        domain: c.domain,
        serverId: c.serverId,
        host: c.host,
        port: c.port,
        contactUri: contact.uri,
        expiresSec: c.expiresSec,
        callId,
        fromTag,
        cseq: 1,
        viaHost: '127.0.0.1',
        localPort,
    }), 8000);

    let status = parseStatus(first.text);
    let auth = null;
    if (status === 401 || status === 407) {
        const www = extractHeader(first.text, status === 407 ? 'Proxy-Authenticate' : 'WWW-Authenticate');
        auth = parseWwwAuthenticate(www);
        if (!auth) {
            return {
                ok: false,
                deviceId: did,
                reason: 'challenge_parse_fail',
                status,
                snippet: String(first.text).slice(0, 180),
            };
        }
    } else if (status === 200) {
        return afterRegisterOk(did, contact, status);
    } else if (status) {
        return {
            ok: false,
            deviceId: did,
            reason: 'unexpected_status',
            status,
            snippet: String(first.text).slice(0, 180),
        };
    } else {
        return { ok: false, deviceId: did, reason: 'no_sip_status', snippet: String(first.text).slice(0, 180) };
    }

    const usernames = [did, 'admin'];
    let lastFail = null;
    for (let u = 0; u < usernames.length; u += 1) {
        const username = usernames[u];
        const second = await udpRegisterRound(c.host, c.port, (localPort) => buildRegisterText({
            deviceId: did,
            domain: c.domain,
            serverId: c.serverId,
            host: c.host,
            port: c.port,
            contactUri: contact.uri,
            expiresSec: c.expiresSec,
            callId,
            fromTag,
            cseq: 2 + u,
            viaHost: '127.0.0.1',
            localPort,
            auth: {
                username,
                password: c.password,
                realm: auth.realm,
                nonce: auth.nonce,
                opaque: auth.opaque,
            },
        }), 8000);
        status = parseStatus(second.text);
        if (status === 200) {
            return afterRegisterOk(did, contact, status, username);
        }
        lastFail = {
            ok: false,
            deviceId: did,
            reason: 'auth_rejected',
            status,
            username,
            snippet: String(second.text).slice(0, 180),
        };
        /* fresh challenge? */
        if (status === 401 || status === 407) {
            const www = extractHeader(second.text, status === 407 ? 'Proxy-Authenticate' : 'WWW-Authenticate');
            const next = parseWwwAuthenticate(www);
            if (next) auth = next;
        }
    }
    return lastFail || { ok: false, deviceId: did, reason: 'auth_failed' };
}

async function afterRegisterOk(deviceId, contact, status, username) {
    lastOk.set(deviceId, Date.now());
    log.media.info('wvp fleet register mirror ok', {
        deviceId,
        contact: contact.uri,
        status,
        username: username || null,
    });
    /* Channel row may still need insert — use real LAN for map; invite route sets hostAddress. */
    const channelSeed = patchWvpDbLanAndChannel(deviceId, contact.ip, contact.port || 5060, {
        streamMode: 'TCP-PASSIVE',
    });
    let sync = null;
    let inviteRoute = null;
    try {
        const wvp = require('./wvpLabClient');
        if (String(process.env.FM_LAB_WVP || '').trim() !== '1') {
            process.env.FM_LAB_WVP = '1';
        }
        /* Keep real BWC LAN in map; WVP hostAddress = SIP proxy (invite-rtp-answer). */
        wvpSipLanMap.rememberLan(deviceId, contact.ip, contact.port || 5060, 'after_mirror_register');
        if (typeof wvp.updateDeviceInviteRoute === 'function') {
            inviteRoute = await wvp.updateDeviceInviteRoute(deviceId);
        } else {
            sync = await wvp.syncLanSourceIps({ deviceId, reason: 'after_mirror_register' });
        }
        let catalog = null;
        if (typeof wvp.syncDeviceCatalog === 'function') {
            catalog = await wvp.syncDeviceCatalog(deviceId);
        }
        sync = Object.assign({}, sync || {}, {
            inviteRoute,
            channelSeed,
            catalog,
            dbPatch: inviteRoute && inviteRoute.dbPatch ? inviteRoute.dbPatch : channelSeed,
        });
        if (inviteRoute && inviteRoute.ok) {
            log.media.info('wvp mirror invite route', {
                deviceId,
                hostAddress: inviteRoute.hostAddress,
                realLan: contact.ip + (contact.port ? (':' + contact.port) : ''),
            });
        }
    } catch (err) {
        log.media.warn('wvp mirror sync after register', {
            deviceId,
            message: err && err.message ? String(err.message).slice(0, 120) : 'sync_fail',
        });
        sync = { channelSeed, error: err && err.message };
    }
    return {
        ok: true,
        deviceId,
        contact: contact.uri,
        ip: contact.ip,
        port: contact.port,
        status,
        username: username || null,
        sync,
        dbPatch: (inviteRoute && inviteRoute.dbPatch) || channelSeed,
    };
}

function scheduleFromFleetRegister(deviceId, contactUri) {
    if (!isEnabled()) return { scheduled: false, reason: 'disabled' };
    const did = String(deviceId || '').trim();
    if (!wvpSipLanMap.isBwcGbId(did)) return { scheduled: false, reason: 'not_bwc_gb_id' };
    const contact = normalizeContactUri(contactUri, did);
    if (!contact) return { scheduled: false, reason: 'no_lan_contact' };

    const c = mirrorCfg();
    const last = lastOk.get(did) || 0;
    if (Date.now() - last < c.minIntervalMs && !pending.has(did)) {
        ensureRefresh(did, contact.uri);
        return { scheduled: false, reason: 'min_interval' };
    }

    if (pending.has(did)) clearTimeout(pending.get(did));
    const t = setTimeout(() => {
        pending.delete(did);
        registerDeviceOnce(did, contact.uri)
            .then((r) => {
                if (r && r.ok) ensureRefresh(did, contact.uri);
                else {
                    log.media.warn('wvp fleet register mirror fail', {
                        deviceId: did,
                        reason: r && r.reason,
                        status: r && r.status,
                        snippet: r && r.snippet,
                    });
                }
            })
            .catch((err) => {
                log.media.warn('wvp fleet register mirror error', {
                    deviceId: did,
                    message: err && err.message ? String(err.message).slice(0, 160) : 'fail',
                });
            });
    }, c.debounceMs);
    pending.set(did, t);
    return { scheduled: true, deviceId: did, contact: contact.uri };
}

function ensureRefresh(deviceId, contactUri) {
    if (!isEnabled()) return;
    const did = String(deviceId || '').trim();
    if (refreshTimers.has(did)) return;
    const c = mirrorCfg();
    const timer = setInterval(() => {
        if (!isEnabled()) return;
        registerDeviceOnce(did, contactUri).catch(() => { /* logged inside */ });
    }, c.refreshMs);
    if (timer.unref) timer.unref();
    refreshTimers.set(did, timer);
}

async function mirrorAllFromContactCache() {
    if (!isEnabled()) return { ok: false, reason: 'disabled', results: [] };
    const lans = wvpSipLanMap.allFleetContactLans();
    const ids = Object.keys(lans);
    const results = [];
    for (let i = 0; i < ids.length; i += 1) {
        const id = ids[i];
        const uri = 'sip:' + id + '@' + lans[id].ip
            + (lans[id].port ? (':' + lans[id].port) : '');
        try {
            const r = await registerDeviceOnce(id, uri);
            results.push(r);
            if (r && r.ok) ensureRefresh(id, uri);
        } catch (err) {
            results.push({
                ok: false,
                deviceId: id,
                reason: 'exception',
                message: err && err.message ? String(err.message).slice(0, 120) : 'fail',
            });
        }
    }
    return {
        ok: results.some((r) => r && r.ok),
        count: results.length,
        results,
    };
}

function stop() {
    pending.forEach((t) => clearTimeout(t));
    pending.clear();
    refreshTimers.forEach((t) => clearInterval(t));
    refreshTimers.clear();
}

module.exports = {
    isEnabled,
    mirrorCfg,
    scheduleFromFleetRegister,
    registerDeviceOnce,
    mirrorAllFromContactCache,
    stop,
};
