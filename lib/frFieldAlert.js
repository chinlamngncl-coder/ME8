/**
 * FR field alert — PTT cue and/or soft SIP text MESSAGE to ONE cam.
 * Isolated from SOS and from PTT talk/Call control paths.
 * Only uses pttServer.sendPttAudioToDevice + sip MESSAGE (text/plain).
 *
 * mob-fr-field-alert-repeat-10: ~10 dual-beep repeats for noisy field.
 * mob-fr-field-alert-pace-20ms: send one G.711 frame every 20 ms (not a dump).
 */
'use strict';

const { pcm16ToAlaw, amplifyAlaw } = require('./psG711Audio');
const { createSipCallId, createSipTag } = require('./sipCryptoIdentifiers');

const FRAME = 160; /* 20 ms @ 8 kHz PCMA — matches pttServer */
const FRAME_MS = 20;
const REPEAT_COUNT = Math.max(1, Math.min(20, parseInt(process.env.FM_FR_FIELD_ALERT_REPEATS || '10', 10) || 10));
/** Cooldown covers full burst (~8–10 s) + margin so one press ≠ spam. */
const COOLDOWN_MS = Math.max(20000, parseInt(process.env.FM_FR_FIELD_ALERT_COOLDOWN_MS || '25000', 10) || 25000);
const lastAlertAt = new Map();
/** camId → { timer, cancelled } — stop mid-burst if Call starts */
const activeBurst = new Map();

/**
 * One dual-beep unit (~0.5 s tones) + trailing silence (~0.35 s).
 * Pattern, not a continuous scream.
 */
function buildOneBeepUnitPcm(sr) {
    const toneMs = 0.50;
    const gapMs = 0.35;
    const total = Math.floor(sr * (toneMs + gapMs));
    const pcm = Buffer.alloc(total * 2);
    for (let i = 0; i < total; i++) {
        const t = i / sr;
        let s = 0;
        if (t < 0.16) s = Math.sin(2 * Math.PI * 880 * t) * 12000;
        else if (t >= 0.24 && t < 0.42) s = Math.sin(2 * Math.PI * 1175 * t) * 12000;
        /* else silence (gap) */
        pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(s))), i * 2);
    }
    return pcm;
}

/** ~10 dual-beep repeats — watchlist catch cue for noisy environments. */
function buildAlertAlaw() {
    const sr = 8000;
    const unit = buildOneBeepUnitPcm(sr);
    const parts = [];
    for (let r = 0; r < REPEAT_COUNT; r++) parts.push(unit);
    const pcm = Buffer.concat(parts);
    let alaw = pcm16ToAlaw(pcm);
    const pad = FRAME - (alaw.length % FRAME);
    if (pad !== FRAME) alaw = Buffer.concat([alaw, Buffer.alloc(pad, 0xd5)]);
    return amplifyAlaw(alaw, 1.35);
}

let cachedCue = null;
function alertCueAlaw() {
    if (!cachedCue) cachedCue = buildAlertAlaw();
    return cachedCue;
}

function cancelBurst(camId) {
    const id = String(camId || '');
    const b = activeBurst.get(id);
    if (!b) return;
    b.cancelled = true;
    if (b.timer) {
        try { clearTimeout(b.timer); } catch (_) { /* ignore */ }
        b.timer = null;
    }
    activeBurst.delete(id);
}

/**
 * Pace alaw to device at realtime (one 160 B frame / 20 ms) — Talk-compatible.
 * Dumping the whole buffer caused “1 beep” on BWC (MOB-DISC-FR-FIELD-ALERT-ONE-BEEP).
 */
function sendPacedAlaw(camId, alaw, deps) {
    return new Promise((resolve) => {
        if (!alaw || !alaw.length || !deps.pttServer) {
            resolve(false);
            return;
        }
        cancelBurst(camId);
        const state = { timer: null, cancelled: false, off: 0, sent: 0 };
        activeBurst.set(camId, state);

        const tick = () => {
            if (state.cancelled) {
                activeBurst.delete(camId);
                resolve(state.sent > 0);
                return;
            }
            const onCall = typeof deps.isVoiceCallActive === 'function' && deps.isVoiceCallActive(camId);
            const pttCallCam = typeof deps.getPttVoiceCallCamId === 'function' ? deps.getPttVoiceCallCamId() : null;
            if (onCall || (pttCallCam && String(pttCallCam) === camId)) {
                cancelBurst(camId);
                resolve(state.sent > 0);
                return;
            }
            if (!deps.pttServer.isDevicePttOnline(camId)) {
                cancelBurst(camId);
                resolve(state.sent > 0);
                return;
            }
            if (state.off >= alaw.length) {
                cancelBurst(camId);
                resolve(state.sent > 0);
                return;
            }
            const frame = alaw.subarray(state.off, state.off + FRAME);
            state.off += FRAME;
            try {
                if (deps.pttServer.sendPttAudioToDevice(camId, frame)) state.sent += 1;
            } catch (_) { /* ignore frame */ }
            state.timer = setTimeout(tick, FRAME_MS);
        };

        tick();
    });
}

/**
 * @param {object} opts
 * @param {string} opts.camId
 * @param {string} [opts.displayName]
 * @param {object} opts.deps
 * @returns {{ ok: boolean, ptt: boolean, message: boolean, error?: string, repeats?: number, paced?: boolean }}
 */
function sendFrFieldAlert(opts) {
    const camId = String((opts && opts.camId) || '').trim();
    const deps = (opts && opts.deps) || {};
    if (!camId) return { ok: false, ptt: false, message: false, error: 'no_cam' };

    const now = Date.now();
    const prev = lastAlertAt.get(camId) || 0;
    if (now - prev < COOLDOWN_MS) {
        return { ok: false, ptt: false, message: false, error: 'cooldown' };
    }

    let pttOk = false;
    let msgOk = false;
    const errors = [];

    const onCall = typeof deps.isVoiceCallActive === 'function' && deps.isVoiceCallActive(camId);
    const pttCallCam = typeof deps.getPttVoiceCallCamId === 'function' ? deps.getPttVoiceCallCamId() : null;
    const skipPtt = !!(onCall || (pttCallCam && String(pttCallCam) === camId));

    /* Soft text MESSAGE first (sync) — never DeviceControl / Alarm / SOS XML. */
    const contact = typeof deps.getContactUri === 'function' ? deps.getContactUri(camId) : null;
    if (contact && deps.sip && deps.realm && deps.serverId) {
        const name = String((opts && opts.displayName) || 'watchlist').slice(0, 40);
        const body = 'FR ALERT: ' + name;
        try {
            deps.sip.send({
                method: 'MESSAGE',
                uri: contact,
                headers: {
                    to: { uri: `sip:${camId}@${deps.realm}` },
                    from: {
                        uri: `sip:${deps.serverId}@${deps.realm}`,
                        params: { tag: createSipTag() },
                    },
                    'call-id': createSipCallId(),
                    cseq: { method: 'MESSAGE', seq: 1 },
                    'content-type': 'text/plain',
                    'content-length': Buffer.byteLength(body),
                },
                content: body,
            }, () => {});
            msgOk = true;
        } catch (_) {
            errors.push('message_exception');
        }
    } else {
        errors.push('no_sip_contact');
    }

    const canPtt = !skipPtt && deps.pttServer && typeof deps.pttServer.isDevicePttOnline === 'function'
        && deps.pttServer.isDevicePttOnline(camId)
        && typeof deps.pttServer.sendPttAudioToDevice === 'function';

    if (skipPtt) errors.push('ptt_skipped_call_active');
    else if (!canPtt) errors.push('ptt_offline');

    /* Reserve cooldown at start so double-click does not stack bursts */
    if (msgOk || canPtt) lastAlertAt.set(camId, now);

    if (canPtt) {
        /* Fire-and-forget paced burst — socket handler stays sync; result reflects start OK */
        pttOk = true;
        sendPacedAlaw(camId, alertCueAlaw(), deps).then((played) => {
            if (deps.log) {
                try {
                    deps.log.media.info('fr field alert paced done', {
                        camId,
                        played: !!played,
                        repeats: REPEAT_COUNT,
                    });
                } catch (_) { /* ignore */ }
            }
        }).catch(() => { /* ignore */ });
    }

    const ok = pttOk || msgOk;

    if (deps.log) {
        try {
            deps.log.media.info('fr field alert', {
                camId,
                ptt: pttOk,
                message: msgOk,
                repeats: REPEAT_COUNT,
                paced: !!canPtt,
                skipPtt: !!skipPtt,
                error: ok ? null : errors.join(','),
            });
        } catch (_) { /* ignore */ }
    }

    return {
        ok,
        ptt: pttOk,
        message: msgOk,
        repeats: REPEAT_COUNT,
        paced: !!canPtt,
        error: ok ? undefined : (errors[0] || 'failed'),
    };
}

module.exports = {
    sendFrFieldAlert,
    cancelBurst,
    COOLDOWN_MS,
    REPEAT_COUNT,
    FRAME_MS,
};
