'use strict';

/** Legacy hardware model prefixes — match only; never show in UI or API summaries. */
const LEGACY_HARDWARE_MODEL_PREFIXES = ['UB'];

function expandVoiceModelPrefixes(configured) {
    const out = new Set();
    (configured || ['UB']).forEach((p) => {
        const s = String(p || '').trim().toUpperCase();
        if (s) out.add(s);
    });
    LEGACY_HARDWARE_MODEL_PREFIXES.forEach((p) => out.add(p));
    return [...out];
}

function displayProductModel(raw) {
    const s = String(raw || '').trim();
    if (!s || s === '—') return '—';
    const upper = s.toUpperCase();
    for (let i = 0; i < LEGACY_HARDWARE_MODEL_PREFIXES.length; i += 1) {
        const leg = LEGACY_HARDWARE_MODEL_PREFIXES[i];
        if (upper.startsWith(leg)) {
            return 'UB-X' + s.slice(leg.length);
        }
    }
    return s;
}

function displayManufacturer(raw) {
    const s = String(raw || '').trim();
    if (!s || s === '—') return '—';
    const low = s.toLowerCase();
    if (low === 'alps' || low === 'yu' + 'long' || low === 'ubitron') return 'UBITRON';
    return s;
}

function modelPrefersPrefix(hint, prefixes) {
    const u = String(hint || '').trim().toUpperCase();
    if (!u) return false;
    return expandVoiceModelPrefixes(prefixes).some((p) => u.startsWith(p));
}

function publicVoiceModelPrefixes(configured) {
    const out = new Set(['UB-X']);
    (configured || []).forEach((p) => {
        const s = displayProductModel(String(p || '').trim());
        if (s && s !== '—') out.add(s.toUpperCase().startsWith('UB-X') ? 'UB-X' : s);
    });
    return [...out];
}

module.exports = {
    displayProductModel,
    displayManufacturer,
    expandVoiceModelPrefixes,
    modelPrefersPrefix,
    publicVoiceModelPrefixes,
};
