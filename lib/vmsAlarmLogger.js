'use strict';
/**
 * VMS Alarm Marker Logger + live Wall feed (COMMAND-WALL-ALARM-STRIP-V1)
 *
 * Writes lightweight timestamp rows to vms_alarm_markers from ONVIF pull-point
 * events. Optionally emits to dashboards via setLiveEmit (Socket.IO bridge).
 */

const crypto = require('crypto');
const siteDb  = require('./siteDb');
const log     = require('./fleetLog');

const VALID_EVENT_TYPES = new Set([
    'motion', 'tamper', 'line_crossing', 'analytics', 'anpr', 'sos', 'other',
]);

/** @type {null|function(object): void} */
let liveEmit = null;

function setLiveEmit(fn) {
    liveEmit = typeof fn === 'function' ? fn : null;
}

function makeId() {
    return 'alm-' + crypto.randomBytes(6).toString('hex');
}

/**
 * Insert one alarm marker row. Non-throwing — failures are logged and swallowed
 * so a DB hiccup never kills the ONVIF event subscription loop.
 */
async function logAlarmMarker(camId, eventType, note) {
    const type = VALID_EVENT_TYPES.has(eventType) ? eventType : 'other';
    const id   = makeId();
    const occurredAt = new Date().toISOString();
    try {
        await siteDb.query(
            `INSERT INTO vms_alarm_markers (id, cam_id, occurred_at, event_type, note, retain_marker)
             VALUES ($1, $2, $3, $4, $5, TRUE)`,
            [id, String(camId), occurredAt, type, String(note || '').slice(0, 500)]
        );
    } catch (err) {
        log.web.warn('[vms-alarm] db insert failed', {
            camId, type, error: err && err.message,
        });
    }
    try {
        if (liveEmit && type !== 'other') {
            liveEmit({
                source: 'vms_' + type,
                camId: String(camId),
                alarmType: type,
                eventId: id,
                occurredAt,
                note: String(note || '').slice(0, 200),
            });
        }
    } catch (_) { /* never break ONVIF loop */ }
}

/**
 * Returns an onEvent handler compatible with fixedCamOnvif.startEventSubscription().
 * Skips 'other' events (unclassified) to avoid noise.
 */
function onvifEventHandler(camId) {
    return function onvifEvent(parsed) {
        const eventType = parsed && parsed.kind;
        if (!eventType || eventType === 'other') return;
        logAlarmMarker(
            camId,
            eventType,
            parsed.topic || ''
        );
    };
}

module.exports = { logAlarmMarker, onvifEventHandler, setLiveEmit };
