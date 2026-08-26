'use strict';
/**
 * Global UI text dictionary — never dump raw DB/enum tags to the operator.
 */
(function (global) {
    var TAG_MAP = {
        'SOS': 'SOS Emergency',
        'TAG SOS': 'SOS Emergency',
        'SOS_EMERGENCY': 'SOS Emergency',
        'SOS EMERGENCY': 'SOS Emergency',
        'FALL': 'Fall Detected',
        'TAG FALL': 'Fall Detected',
        'FALL DETECTED': 'Fall Detected',
        'ACK': 'Acknowledged',
        'TAG ACK': 'Acknowledged',
        'ACKNOWLEDGED': 'Acknowledged',
        'OPEN': 'Open',
        'TAG OPEN': 'Open',
        'HINT ACK': '',
        'HINT_ACK': '',
        'HINT OPEN': '',
        'HINT_OPEN': '',
        'PTT': 'PTT',
        'FIXED': 'Fixed Camera',
        'ITEM': 'Item',
        'SEGMENT': 'Segment',
        'BWC': 'Body Camera',
        'ANALYTICS': 'Analytics',
        'ACK ONLY': 'Ack only',
        'ACK_ONLY': 'Ack only',
        'HAS NOTES': 'Has notes',
        'HAS_NOTES': 'Has notes',
        'AMENDED': 'Amended',
        'REVIEWED': 'Reviewed',
        'ARCHIVED': 'Archived',
        'LIVE': 'Live',
        'SHARING': 'Sharing',
        'CONNECTING': 'Connecting',
        'IDLE': 'Idle',
        'ONLINE': 'Online',
        'OFFLINE': 'Offline',
        'ACTIVE': 'Active',
        'RETIRED': 'Retired',
    };

    var MIDDOT = '\u00B7';

    function normalizeKey(raw) {
        return String(raw == null ? '' : raw)
            .replace(/\u00C2\u00B7/g, ' ')
            .replace(/\u00B7/g, ' ')
            .replace(/·/g, ' ')
            .trim()
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .toUpperCase();
    }

    /**
     * Map internal / raw tags to professional UI copy.
     * Unknown tags: Title Case, strip TAG_ / tag prefixes — never shout raw enums.
     */
    function formatEventTag(rawTag) {
        var key = normalizeKey(rawTag);
        if (!key) return '';
        if (Object.prototype.hasOwnProperty.call(TAG_MAP, key)) {
            return TAG_MAP[key];
        }
        var cleaned = String(rawTag == null ? '' : rawTag)
            .replace(/·/g, ' ')
            .replace(/^TAG[\s_]+/i, '')
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (!cleaned) return '';
        return cleaned
            .toLowerCase()
            .replace(/\b([a-z])/g, function (m) { return m.toUpperCase(); });
    }

    /** Join non-empty formatted parts with a clean middot separator. */
    function joinEventTags(parts) {
        var out = [];
        (parts || []).forEach(function (p) {
            var t = formatEventTag(p);
            if (t) out.push(t);
        });
        return out.join(' ' + MIDDOT + ' ');
    }

    /** Fix common UTF-8 mojibake middot in any string. */
    function scrubMojibake(s) {
        return String(s == null ? '' : s)
            .split('\u00C2\u00B7').join(MIDDOT)
            .replace(/\u00C3\u2014/g, '\u2014')
            .replace(/\u00E2\u20AC\u201D/g, '\u2014')
            .replace(/\u00E2\u20AC\u201C/g, '\u2013')
            .replace(/\u00E2\u20AC\u2122/g, '\u2019');
    }

    global.UiFormatter = {
        MIDDOT: MIDDOT,
        formatEventTag: formatEventTag,
        joinEventTags: joinEventTags,
        scrubMojibake: scrubMojibake,
    };
})(typeof window !== 'undefined' ? window : global);
