'use strict';

/**
 * BOOT-CURRENT-LAN-HOST-V1 — this-boot Wi-Fi/Ethernet IPv4 for camera SIP/media.
 * Operator login stays http://localhost:3988. Never 127 / 169.254 / 172.17–172.31.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PS1 = path.join(__dirname, '..', 'scripts', 'Get-UbitronPreferredLanIPv4.ps1');
const WVP_DIR = path.join(__dirname, '..', 'docker', 'wvp');
const WVP_ENV = path.join(WVP_DIR, '.env');

function isBadLanIp(ip) {
    const s = String(ip || '').trim();
    if (!s) return true;
    if (s.startsWith('127.')) return true;
    if (s.startsWith('169.254.')) return true;
    if (/^172\.(1[7-9]|2[0-9]|3[0-1])\./.test(s)) return true;
    return !/^\d{1,3}(\.\d{1,3}){3}$/.test(s);
}

function detectLanIPv4() {
    try {
        const r = spawnSync(
            'powershell.exe',
            ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', PS1, '-Print'],
            { encoding: 'utf8', windowsHide: true, timeout: 12000 }
        );
        const ip = String((r.stdout || '').trim().split(/\r?\n/).pop() || '').trim();
        if (!isBadLanIp(ip)) return ip;
    } catch (_) { /* fall through */ }
    return null;
}

function clearStaleRoutingEnv() {
    delete process.env.HOST;
    delete process.env.FM_GB28181_PUBLIC_HOST;
    delete process.env.FM_WVP_STREAM_HOST;
    delete process.env.WVP_HOST_IP;
    delete process.env.WVP_HOST;
}

function writeWvpHostEnv(ip) {
    let body = '';
    try { body = fs.readFileSync(WVP_ENV, 'utf8'); } catch (_) { body = ''; }
    const line = 'WVP_HOST_IP=' + ip;
    if (/^WVP_HOST_IP=/m.test(body)) {
        body = body.replace(/^WVP_HOST_IP=.*$/m, line);
    } else {
        body = (body ? String(body).replace(/\s*$/, '\n') : '') + line + '\n';
    }
    fs.writeFileSync(WVP_ENV, body, 'utf8');
}

function injectWvpBroker(ip) {
    try { writeWvpHostEnv(ip); } catch (_) { /* compose still gets process.env */ }
    try {
        const r = spawnSync(
            'docker',
            ['compose', '-p', 'me8-wvp', '-f', 'docker-compose.wvp.yml', 'up', '-d', '--force-recreate', '--no-deps', 'wvp'],
            {
                cwd: WVP_DIR,
                env: Object.assign({}, process.env, { WVP_HOST_IP: ip, WVP_HOST: ip }),
                encoding: 'utf8',
                windowsHide: true,
                timeout: 60000,
            }
        );
        const ok = r && r.status === 0;
        /* eslint-disable no-console */
        console.log('WVP SIP/SDP IP: ' + ip + (ok ? ' (container recreated)' : ' (Fleet set; recreate WVP if video still times out)'));
        /* eslint-enable no-console */
        return ok;
    } catch (_) {
        /* eslint-disable no-console */
        console.log('WVP SIP/SDP IP: ' + ip + ' (Fleet set; start WVP lab to apply container)');
        /* eslint-enable no-console */
        return false;
    }
}

function apply() {
    clearStaleRoutingEnv();
    const ip = detectLanIPv4();
    const httpPort = String(process.env.FM_HTTP_PORT || process.env.PORT || '3988').trim() || '3988';
    if (ip) {
        process.env.HOST = ip;
        process.env.FM_GB28181_PUBLIC_HOST = ip;
        process.env.FM_WVP_STREAM_HOST = ip;
        process.env.WVP_HOST_IP = ip;
        process.env.WVP_HOST = ip;
        const lk = String(process.env.FM_LIVEKIT_PUBLIC_WS || '').trim();
        if (lk) process.env.FM_LIVEKIT_PUBLIC_WS = lk.replace(/\/\/\d+\.\d+\.\d+\.\d+/, '//' + ip);
        injectWvpBroker(ip);
    }
    const lan = ip || '(none — set camera SIP to this PC Wi-Fi IPv4)';
    /* eslint-disable no-console */
    console.log('');
    console.log('Mobility Axiom');
    console.log('Operator Login: http://localhost:' + httpPort);
    console.log('Camera SIP/Media IP: ' + lan);
    console.log('');
    /* eslint-enable no-console */
    return ip;
}

module.exports = { apply, detectLanIPv4, isBadLanIp };
