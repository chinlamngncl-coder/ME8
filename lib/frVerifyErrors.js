/**
 * FR Verify — operator error catalog (stable codes).
 * UI maps code → i18n. Never put uvicorn/sidecar/stack traces in operator text.
 */
const CODES = {
    NOT_LICENSED: 'fr.not_licensed',
    SERVICE_DOWN: 'fr.service_down',
    NEED_TWO: 'fr.need_two',
    NEED_NAME: 'fr.need_name',
    NO_FACE: 'fr.no_face',
    MULTIPLE_FACES: 'fr.multi_face',
    QUALITY_LOW: 'fr.quality_low',
    QUALITY_BLUR: 'fr.quality_blur',
    QUALITY_LIGHTING: 'fr.quality_lighting',
    FACE_TOO_SMALL: 'fr.face_too_small',
    IMAGE_TOO_SMALL: 'fr.image_too_small',
    BUSY: 'fr.busy',
    BAD_FILE: 'fr.bad_file',
    TIMEOUT: 'fr.timeout',
    BLACKLIST_FULL: 'fr.blacklist_full',
    NOT_FOUND: 'fr.not_found',
    FAILED: 'fr.failed',
};

function classifySidecarResult(result) {
    if (!result || typeof result !== 'object') {
        return { code: CODES.FAILED, httpStatus: 422 };
    }
    if (result.ok === true) return null;

    const err = String(result.error || '').toLowerCase();
    const msg = String(result.message || result.hint || '').toLowerCase();

    if (err === 'sidecar_not_running' || err === 'sidecar_unreachable' || err === 'sidecar_start_timeout'
        || err === 'not_running' || msg.includes('econnrefused')) {
        return { code: CODES.SERVICE_DOWN, httpStatus: 503 };
    }
    if (err === 'sidecar_timeout' || err === 'timeout' || msg.includes('timeout')) {
        return { code: CODES.TIMEOUT, httpStatus: 504 };
    }
    if (err === 'face_not_detected' || msg.includes('face could not be detected')
        || msg.includes('confirm that the picture') || msg.includes('no face')) {
        return { code: CODES.NO_FACE, httpStatus: 422 };
    }
    if (err === 'multiple_faces' || err === 'multi_face') {
        return { code: CODES.MULTIPLE_FACES, httpStatus: 422 };
    }
    if (err === 'face_too_small') {
        return { code: CODES.FACE_TOO_SMALL, httpStatus: 422 };
    }
    if (err === 'image_too_small') {
        return { code: CODES.IMAGE_TOO_SMALL, httpStatus: 422 };
    }
    if (err === 'quality_blur' || (err === 'quality_low' && String(result.gate || '') === 'sharpness')
        || (msg.includes('sharpness') && !msg.includes('lighting'))) {
        return { code: CODES.QUALITY_BLUR, httpStatus: 422 };
    }
    if (err === 'quality_lighting' || (err === 'quality_low' && String(result.gate || '') === 'lighting')
        || msg.includes('lighting')) {
        return { code: CODES.QUALITY_LIGHTING, httpStatus: 422 };
    }
    if (err === 'quality_low' || msg.includes('blur') || msg.includes('low quality')) {
        return { code: CODES.QUALITY_LOW, httpStatus: 422 };
    }
    if (err === 'image_path_missing' || err === 'bad_file' || msg.includes('cannot identify image')
        || msg.includes('image too large') || msg.includes('file type')) {
        return { code: CODES.BAD_FILE, httpStatus: 400 };
    }
    if (msg.includes('too small') || msg.includes('resolution')) {
        return { code: CODES.QUALITY_LOW, httpStatus: 422 };
    }
    if (err === 'engine_broken' || msg.includes('numpy') || msg.includes('tensorflow')
        || msg.includes('_array_api')) {
        return { code: CODES.SERVICE_DOWN, httpStatus: 503 };
    }
    if (err === 'represent_failed' || err.startsWith('represent_http_')) {
        return { code: CODES.FAILED, httpStatus: 422 };
    }
    if (err === 'busy' || msg.includes('resource exhausted') || msg.includes('too many')) {
        return { code: CODES.BUSY, httpStatus: 503 };
    }
    if (err.startsWith('verify_http_5') || err.startsWith('represent_http_5')) {
        return { code: CODES.BUSY, httpStatus: 503 };
    }
    return { code: CODES.FAILED, httpStatus: 422 };
}

function operatorPayload(code, httpStatus) {
    return {
        ok: false,
        code: code,
        // Keep a short English fallback for clients without i18n; UI prefers code.
        error: code,
    };
}

module.exports = {
    CODES,
    classifySidecarResult,
    operatorPayload,
};
