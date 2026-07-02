/**
 * Classify BWC message-service text into dashboard alarm kinds (fall / SOS).
 * Complements SIP Alarm NOTIFY in alarmFromXml.js.
 */

const FALL_TEXT = /fall|跌倒|摔倒|tumble|falldown|fall_down|fall-down|person\s*down|倒地|낙상|jatuh|pagkahulog|หกล้ม/i;
const SOS_TEXT = /\bsos\b|distress|emergency|求救|긴급|emergencia|darurat|ฉุกเฉิน/i;

function classifyMessageText(text) {
    if (!text || typeof text !== 'string') return null;
    const t = text.trim();
    if (!t || t.length > 2000) return null;
    if (FALL_TEXT.test(t)) return 'fall';
    if (SOS_TEXT.test(t)) return 'sos';
    return null;
}

/**
 * @returns {'fall'|'sos'|null}
 */
function classifyMessage(text, type, level) {
    const fromText = classifyMessageText(text);
    if (fromText) return fromText;
    /* Reserved: vendor may use dedicated type/level codes later. */
    if (type != null && Number(type) === 200) return 'fall';
    if (type != null && Number(type) === 201) return 'sos';
    if (level != null && Number(level) === 200) return 'fall';
    if (level != null && Number(level) === 201) return 'sos';
    return null;
}

module.exports = {
    classifyMessage,
    classifyMessageText,
};
