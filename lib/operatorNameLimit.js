/** Officer / BWC nickname — max characters (all languages: 1 char = 1). */
const OPERATOR_NAME_MAX_CHARS = 12;

function clampOperatorName(value) {
    const s = String(value == null ? '' : value).trim();
    if (!s) return '';
    const chars = Array.from(s);
    if (chars.length <= OPERATOR_NAME_MAX_CHARS) return s;
    return chars.slice(0, OPERATOR_NAME_MAX_CHARS).join('');
}

module.exports = {
    OPERATOR_NAME_MAX_CHARS,
    clampOperatorName,
};
