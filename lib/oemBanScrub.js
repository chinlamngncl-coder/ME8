/**
 * OEM-BAN-SCRUB-LOGS-UI-V1 — redact banned OEM tokens from Axiom logs / UI-bound strings.
 * Does not alter BWC SIP on the wire.
 */
'use strict';

const PATTERNS = [
    { re: /yu[\s_-]*long/gi, to: 'OEM' },
    { re: /\bYULONG\b/gi, to: 'OEM' },
    { re: /\bYDT1\b/g, to: 'VENDOR_AES' },
    { re: /\bYDT\b/g, to: 'USIP' },
];

function scrubOemText(input) {
    let s = String(input == null ? '' : input);
    if (!s) return s;
    for (let i = 0; i < PATTERNS.length; i++) {
        s = s.replace(PATTERNS[i].re, PATTERNS[i].to);
    }
    return s;
}

function scrubOemValue(v) {
    if (v == null) return v;
    if (typeof v === 'string') return scrubOemText(v);
    if (typeof v === 'number' || typeof v === 'boolean') return v;
    if (Array.isArray(v)) return v.map(scrubOemValue);
    if (typeof v === 'object') {
        const out = {};
        Object.keys(v).forEach((k) => {
            out[k] = scrubOemValue(v[k]);
        });
        return out;
    }
    return v;
}

module.exports = {
    scrubOemText,
    scrubOemValue,
};
