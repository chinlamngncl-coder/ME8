'use strict';

/**
 * BOOT-CURRENT-LAN-HOST-V1 — this-boot Wi-Fi/Ethernet IPv4 for camera SIP/media.
 * Operator login stays http://localhost:3988. Never 127 / 169.254 / 172.17–172.31.
 */

const path = require('path');
const { spawnSync } = require('child_process');

const PS1 = path.join(__dirname, '..', 'scripts', 'Get-UbitronPreferredLanIPv4.ps1');

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
    const envIp = String(process.env.FM_GB28181_PUBLIC_HOST || process.env.HOST || '').trim();
    if (!isBadLanIp(envIp)) return envIp;
    return null;
}

function apply() {
    const ip = detectLanIPv4();
    const httpPort = String(process.env.FM_HTTP_PORT || process.env.PORT || '3988').trim() || '3988';
    if (ip) {
        process.env.HOST = ip;
        process.env.FM_GB28181_PUBLIC_HOST = ip;
        process.env.FM_WVP_STREAM_HOST = ip;
        const lk = String(process.env.FM_LIVEKIT_PUBLIC_WS || '').trim();
        if (lk) process.env.FM_LIVEKIT_PUBLIC_WS = lk.replace(/\/\/\d+\.\d+\.\d+\.\d+/, '//' + ip);
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
