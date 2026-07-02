'use strict';

const SITE_TIMEZONES = [
    { id: 'Asia/Singapore', labelKey: 'server.tz.singapore' },
    { id: 'Asia/Manila', labelKey: 'server.tz.manila' },
    { id: 'Asia/Bangkok', labelKey: 'server.tz.bangkok' },
    { id: 'Asia/Jakarta', labelKey: 'server.tz.jakarta' },
    { id: 'Asia/Seoul', labelKey: 'server.tz.seoul' },
    { id: 'Asia/Tokyo', labelKey: 'server.tz.tokyo' },
    { id: 'Asia/Kolkata', labelKey: 'server.tz.kolkata' },
    { id: 'Australia/Sydney', labelKey: 'server.tz.sydney' },
    { id: 'UTC', labelKey: 'server.tz.utc' },
];

let currentTz = String(process.env.FM_SITE_TIMEZONE || 'Asia/Singapore').trim() || 'Asia/Singapore';

function isValidTimezone(tz) {
    try {
        Intl.DateTimeFormat(undefined, { timeZone: tz }).format(new Date());
        return true;
    } catch (_) {
        return false;
    }
}

function configure(tz) {
    const raw = String(tz || '').trim();
    if (raw && isValidTimezone(raw)) {
        currentTz = raw;
    }
    return currentTz;
}

function getTimezone() {
    return currentTz;
}

function listTimezones() {
    return SITE_TIMEZONES.slice();
}

function pad(n, w) {
    return String(n).padStart(w, '0');
}

function formatOffset(d, tz) {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            timeZoneName: 'longOffset',
        }).formatToParts(d);
        const name = (parts.find((p) => p.type === 'timeZoneName') || {}).value || '';
        const m = name.match(/([+-]\d{2}):(\d{2})/);
        if (m) return m[0];
        if (/GMT/i.test(name) && !/[+-]\d/.test(name)) return '+00:00';
    } catch (_) { /* ignore */ }
    return '';
}

function siteLocalParts(d, tz) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).formatToParts(d);
    const pick = (type) => (parts.find((p) => p.type === type) || {}).value || '00';
    return {
        ymd: `${pick('year')}-${pick('month')}-${pick('day')}`,
        hms: `${pick('hour')}:${pick('minute')}:${pick('second')}`,
        ms: pad(d.getMilliseconds(), 3),
        off: formatOffset(d, tz),
    };
}

/** Site-local log stamp, e.g. 2026-06-19 00:30:56.765 +08:00 */
function formatLogStamp(date) {
    return formatEvidence(date);
}

/** Evidence / audit / operator-visible timestamp (same as fleet.log). */
function formatEvidence(date) {
    const d = date instanceof Date ? date : new Date();
    const tz = currentTz;
    const p = siteLocalParts(d, tz);
    return p.off ? `${p.ymd} ${p.hms}.${p.ms} ${p.off}` : `${p.ymd} ${p.hms}.${p.ms}`;
}

/** Site-local date for export filenames, e.g. 2026-06-22 */
function formatEvidenceDate(date) {
    const d = date instanceof Date ? date : new Date();
    return siteLocalParts(d, currentTz).ymd;
}

/** Site-local time without ms/offset — BWC message wire format and compact UI. */
function formatEvidenceShort(date) {
    const d = date instanceof Date ? date : new Date();
    const p = siteLocalParts(d, currentTz);
    return `${p.ymd} ${p.hms}`;
}

module.exports = {
    SITE_TIMEZONES,
    configure,
    getTimezone,
    listTimezones,
    formatLogStamp,
    formatEvidence,
    formatEvidenceDate,
    formatEvidenceShort,
    isValidTimezone,
};
