/**
 * BWC network rules — dynamic-SIM cameras accept numeric SIP server only (no DNS on keypad).
 */

const net = require('net');

function isIpv4(host) {
    const s = String(host || '').trim();
    if (!s) return false;
    if (net.isIP(s) === 4) return true;
    return false;
}

function looksLikeHostname(host) {
    const s = String(host || '').trim();
    if (!s) return false;
    return /[a-zA-Z]/.test(s);
}

function normalizeBwcRegisterIp(host) {
    return String(host || '').trim();
}

/**
 * Rental / SIM BWCs: SIP server field on camera must be IPv4 (fixed cloud, LAN, or VPN endpoint).
 */
function assertBwcRegisterIp(host, options) {
    const opts = options || {};
    const ipOnly = process.env.FM_BWC_SIP_IP_ONLY !== '0';
    const h = normalizeBwcRegisterIp(host);
    if (!h) throw new Error('BWC SIP server IP is required (what cameras dial on their keypad).');
    if (!ipOnly) return h;
    if (!isIpv4(h)) {
        if (looksLikeHostname(h)) {
            throw new Error(
                'BWC SIP server must be an IPv4 address only (e.g. 203.0.113.10). '
                + 'Dynamic-SIM cameras cannot enter hostnames. Use your cloud/LAN/VPN fixed IP here. '
                + 'Put hostnames in Customer login URL for operators instead.'
            );
        }
        throw new Error('BWC SIP server must be a valid IPv4 address (e.g. 203.0.113.10).');
    }
    return h;
}

function networkAccessHints(mode) {
    const hints = {
        'cloud-fixed': 'Public fixed IPv4 on cloud VPS. Port-forward SIP/UDP to this host. Give cameras that IP only.',
        'lan-static': 'Static LAN IPv4 (e.g. 192.168.1.8). Cameras on same site or VPN see this IP.',
        vpn: 'VPN endpoint IPv4 — cameras reach platform through site VPN; still enter IP on BWC, not a name.',
    };
    return hints[mode] || hints['cloud-fixed'];
}

module.exports = {
    isIpv4,
    looksLikeHostname,
    normalizeBwcRegisterIp,
    assertBwcRegisterIp,
    networkAccessHints,
};
