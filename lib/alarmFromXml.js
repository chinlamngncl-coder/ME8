/**
 * Classify SIP / HDA Alarm NOTIFY into dashboard alarm kinds.
 * Falls back to SOS for unknown device alarms (preserves baseline SOS button behaviour).
 */

const FALL_TEXT = /fall|跌倒|摔倒|tumble|falldown|fall_down|fall-down|person\s*down|倒地|drop\s*detect|man\s*down|倾斜|tilt/i;

function notifyField(notify, keys) {
    if (!notify) return null;
    for (let i = 0; i < keys.length; i += 1) {
        const k = keys[i];
        if (notify[k] && notify[k][0] != null && String(notify[k][0]).trim() !== '') {
            return String(notify[k][0]).trim();
        }
    }
    return null;
}

function firstTag(xml, names) {
    if (!xml || typeof xml !== 'string') return null;
    for (let i = 0; i < names.length; i += 1) {
        const n = names[i];
        const m = xml.match(new RegExp('<' + n + '[^>]*>([^<]*)', 'i'));
        if (m && m[1].trim()) return m[1].trim();
    }
    return null;
}

function pickField(notify, xml, keys) {
    return notifyField(notify, keys) || firstTag(xml, keys);
}

function parseIntField(val) {
    if (val == null || val === '') return null;
    const n = parseInt(String(val).trim(), 10);
    return Number.isNaN(n) ? null : n;
}

function nestedAlarmType(notify) {
    if (!notify || !notify.Info) return null;
    const info = notify.Info[0];
    if (!info) return null;
    if (info.AlarmType && info.AlarmType[0] != null) return String(info.AlarmType[0]).trim();
    if (typeof info === 'object' && info.AlarmType != null) return String(info.AlarmType).trim();
    return null;
}

function nestedEventType(notify, xml) {
    if (notify && notify.Info && notify.Info[0]) {
        const info = notify.Info[0];
        if (info.AlarmTypeParam && info.AlarmTypeParam[0] && info.AlarmTypeParam[0].EventType) {
            return String(info.AlarmTypeParam[0].EventType[0] || '').trim();
        }
    }
    return firstTag(xml, ['EventType', 'AlarmEventType', 'EventCode']);
}

/** Known vendor fall codes (extend when firmware samples are captured). */
const FALL_ALARM_TYPES = new Set([
    '13', '14', '15', '16', '17', '18', '19', '20', '21', '22',
    'fall', 'falldown', 'fall_down', 'person_fall', 'tumble', 'falldetection', 'fall_detection',
]);

function textImpliesFall(...parts) {
    return parts.some((p) => p && FALL_TEXT.test(String(p)));
}

function codeImpliesFall(...parts) {
    return parts.some((p) => {
        if (p == null || p === '') return false;
        const s = String(p).trim().toLowerCase();
        return FALL_ALARM_TYPES.has(s) || FALL_TEXT.test(s);
    });
}

/**
 * @returns {{ alarmKind: 'fall'|'sos', alarmMethod: number|null, alarmType: number|null, alarmDescription: string|null, rawHint: string }}
 */
function classifyAlarmNotify(notify, rawXml) {
    const xml = rawXml || '';
    const alarmMethod = parseIntField(pickField(notify, xml, ['AlarmMethod', 'alarmMethod']));
    const topAlarmType = parseIntField(pickField(notify, xml, ['AlarmType', 'alarmType']));
    const infoAlarmType = parseIntField(nestedAlarmType(notify)) ?? parseIntField(firstTag(xml, ['AlarmType']));
    const alarmType = infoAlarmType != null ? infoAlarmType : topAlarmType;
    const alarmPriority = parseIntField(pickField(notify, xml, ['AlarmPriority', 'alarmPriority']));
    const alarmDescription = pickField(notify, xml, [
        'AlarmDescription', 'AlarmInfo', 'Description', 'AlarmContent', 'AlarmEvent', 'EventDescription',
    ]);
    const eventType = nestedEventType(notify, xml);
    const extended = pickField(notify, xml, ['ExtendedInfo', 'ExtendInfo', 'CustomData']);

    const fall = textImpliesFall(alarmDescription, eventType, extended, xml)
        || codeImpliesFall(String(alarmType), eventType, alarmDescription)
        || (alarmMethod === 5 && alarmType != null && alarmType >= 13)
        || (alarmMethod === 2 && alarmDescription && textImpliesFall(alarmDescription));

    if (fall) {
        return {
            alarmKind: 'fall',
            alarmMethod,
            alarmType,
            alarmDescription: alarmDescription || eventType || null,
            rawHint: 'fall',
            alarmPriority,
        };
    }

    const sos = (alarmMethod === 2 && (alarmType == null || alarmType === 5)
            && !(alarmDescription && textImpliesFall(alarmDescription)))
        || (alarmMethod === 5 && alarmType === 1)
        || (alarmMethod === 1);

    return {
        alarmKind: 'sos',
        alarmMethod,
        alarmType,
        alarmDescription: alarmDescription || null,
        rawHint: sos ? 'sos' : 'default_sos',
        alarmPriority,
    };
}

module.exports = {
    classifyAlarmNotify,
};
