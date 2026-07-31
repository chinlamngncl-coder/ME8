/**
 * ANPR Snapshot — operator error catalog (stable codes).
 * UI maps code → i18n. Never put stack traces in operator text.
 */
const CODES = {
    NOT_LICENSED: 'anpr.not_licensed',
    SERVICE_DOWN: 'anpr.service_down',
    NEED_IMAGE: 'anpr.need_image',
    NO_PLATE: 'anpr.no_plate',
    FORMAT_REJECT: 'anpr.format_reject',
    QUALITY_LOW: 'anpr.quality_low',
    BAD_FILE: 'anpr.bad_file',
    TIMEOUT: 'anpr.timeout',
    FAILED: 'anpr.failed',
    BUSY: 'anpr.busy',
};

function operatorPayload(code, httpStatus, extra) {
    const out = {
        ok: false,
        code: code || CODES.FAILED,
        httpStatus: httpStatus || 500,
    };
    if (extra && typeof extra === 'object') {
        Object.keys(extra).forEach((k) => {
            if (out[k] === undefined) out[k] = extra[k];
        });
    }
    return out;
}

function classifyReadResult(result) {
    if (!result || typeof result !== 'object') {
        return { code: CODES.FAILED, httpStatus: 422 };
    }
    if (result.ok === true) return null;

    const err = String(result.error || '').toLowerCase();
    const msg = String(result.message || result.hint || '').toLowerCase();

    if (err === 'engine_missing' || err === 'service_down' || err === 'sidecar_unreachable'
        || err === 'sidecar_not_running' || err === 'sidecar_start_timeout'
        || msg.includes('econnrefused')) {
        return { code: CODES.SERVICE_DOWN, httpStatus: 503 };
    }
    if (err === 'timeout' || msg.includes('timeout')) {
        return { code: CODES.TIMEOUT, httpStatus: 504 };
    }
    if (err === 'format_reject' || err === 'regex_reject' || err === 'ambiguous_read') {
        return { code: CODES.FORMAT_REJECT, httpStatus: 422 };
    }
    if (err === 'plate_not_found' || err === 'no_plate' || err === 'empty_text') {
        return { code: CODES.NO_PLATE, httpStatus: 422 };
    }
    if (err === 'quality_low' || err === 'low_confidence') {
        return { code: CODES.QUALITY_LOW, httpStatus: 422 };
    }
    if (err === 'bad_file' || msg.includes('cannot identify') || msg.includes('file type')) {
        return { code: CODES.BAD_FILE, httpStatus: 400 };
    }
    if (err === 'busy') {
        return { code: CODES.BUSY, httpStatus: 503 };
    }
    return { code: CODES.FAILED, httpStatus: 422 };
}

module.exports = {
    CODES,
    operatorPayload,
    classifyReadResult,
};
